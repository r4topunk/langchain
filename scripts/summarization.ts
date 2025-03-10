import { pull } from "langchain/hub";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate, PromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import "cheerio";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { TokenTextSplitter } from "langchain/text_splitter";
import {
  collapseDocs,
  splitListOfDocs,
} from "langchain/chains/combine_documents/reduce";
import { Document } from "@langchain/core/documents";
import { StateGraph, Annotation, Send, START, END } from "@langchain/langgraph";

const pTagSelector = "p";
const cheerioLoader = new CheerioWebBaseLoader(
  "https://lilianweng.github.io/posts/2023-06-23-agent/",
  {
    selector: pTagSelector,
  }
);

const docs = await cheerioLoader.load();

const llm = new ChatOpenAI({
  model: "gpt-4o-mini",
  temperature: 0,
});

const prompt = PromptTemplate.fromTemplate(
  "Summarize the main theme in these retrieved docs: {context}"
);

const chain = await createStuffDocumentsChain({
  llm,
  outputParser: new StringOutputParser(),
  prompt,
});

// const result = await chain.invoke({ context: docs });
// console.log("result =>", result);

/**
The following is a set of documents:
{docs}
Based on this list of docs, please identify the main themes 
Helpful Answer:
*/
const mapPrompt = await pull<ChatPromptTemplate>("rlm/map-prompt");

/**
The following is set of summaries:
{doc_summaries}
Take these and distill it into a final, consolidated summary of the main themes. 
Helpful Answer:
*/
const reducePrompt = await pull<ChatPromptTemplate>("rlm/reduce-prompt");

const textSplitter = new TokenTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 100,
});

const splitDocs = await textSplitter.splitDocuments(docs);
console.log(`Generated ${splitDocs.length} documents.`);

const TOKEN_MAX = 1000;

const lengthFunction = async (documents: Document[]) => {
  const tokenCounts = await Promise.all(
    documents.map(async (doc) => llm.getNumTokens(doc.pageContent))
  );
  return tokenCounts.reduce((sum, count) => sum + count, 0);
};

const OverallState = Annotation.Root({
  contents: Annotation<string[]>,
  // Notice here we pass a reducer function.
  // This is because we want combine all the summaries we generate
  // from individual nodes back into one list. - this is essentially
  // the "reduce" part
  summaries: Annotation<string[]>({
    reducer: (state, update) => state.concat(update),
  }),
  collapsedSummaries: Annotation<Document[]>,
  finalSummary: Annotation<string>,
});

// This will be the state of the node that we will "map" all
// documents to in order to generate summaries
interface SummaryState {
  content: string;
}

// Here we generate a summary, given a document
const generateSummary = async (
  state: SummaryState
): Promise<{ summaries: string[] }> => {
  const prompt = await mapPrompt.invoke({ docs: state.content });
  const response = await llm.invoke(prompt);
  return { summaries: [String(response.content)] };
};

// Here we define the logic to map out over the documents
// We will use this an edge in the graph
const mapSummaries = (state: typeof OverallState.State) => {
  // We will return a list of `Send` object
  // Each `Send` object consists of the name of a node in the graph
  // as well as the state to send that node
  return state.contents.map(
    (content) => new Send("generateSummary", { content })
  );
};

const collectSummaries = async (state: typeof OverallState.State) => {
  return {
    collapsedSummaries: state.summaries.map(
      (summary) => new Document({ pageContent: summary })
    ),
  };
};

const _reduce = async (input: any) => {
  const prompt = await reducePrompt.invoke({ doc_summaries: input });
  const response = await llm.invoke(prompt);
  return String(response.content);
};

// Add node to collapse summaries
const collapseSummaries = async (state: typeof OverallState.State) => {
  const docLists = splitListOfDocs(
    state.collapsedSummaries,
    lengthFunction,
    TOKEN_MAX
  );
  const results = [];
  for (const docList of docLists) {
    results.push(await collapseDocs(docList, _reduce));
  }

  return { collapsedSummaries: results };
};

// This represents a conditional edge in the graph that determines
// if we should collapse the summaries or not
const shouldCollapse = async (state: typeof OverallState.State) => {
  const numTokens = await lengthFunction(state.collapsedSummaries);
  if (numTokens > TOKEN_MAX) {
    return "collapseSummaries";
  } else {
    return "generateFinalSummary";
  }
};

// Here we will generate the final summary
const generateFinalSummary = async (state: typeof OverallState.State) => {
  const response = await _reduce(state.collapsedSummaries);
  return { finalSummary: response };
};

const graph = new StateGraph(OverallState)
  .addNode("generateSummary", generateSummary)
  .addNode("collectSummaries", collectSummaries)
  .addNode("collapseSummaries", collapseSummaries)
  .addNode("generateFinalSummary", generateFinalSummary)
  .addConditionalEdges(START, mapSummaries, ["generateSummary"])
  .addEdge("generateSummary", "collectSummaries")
  .addConditionalEdges("collectSummaries", shouldCollapse, [
    "collapseSummaries",
    "generateFinalSummary",
  ])
  .addConditionalEdges("collapseSummaries", shouldCollapse, [
    "collapseSummaries",
    "generateFinalSummary",
  ])
  .addEdge("generateFinalSummary", END);

const app = graph.compile();

let finalSummary = "";

for await (const step of await app.stream(
  { contents: splitDocs.map((doc) => doc.pageContent) },
  { recursionLimit: 10 }
)) {
  console.log(Object.keys(step));
  if (step.hasOwnProperty("generateFinalSummary")) {
    finalSummary = step.generateFinalSummary;
  }
}

console.log("finalSummary =>", finalSummary);
