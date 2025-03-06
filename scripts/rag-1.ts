import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { Document } from "@langchain/core/documents";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatGroq } from "@langchain/groq";
import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { OpenAIEmbeddings } from "@langchain/openai";
import "cheerio";
import { pull } from "langchain/hub";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { z } from "zod";

const llm = new ChatGroq({
  model: "mistral-saba-24b",
  temperature: 0,
});

const embeddings = new OpenAIEmbeddings({
  model: "text-embedding-3-large",
});

const vectorStore = new MemoryVectorStore(embeddings);

const pTagSelector = "p";
const cheerioLoader = new CheerioWebBaseLoader(
  "https://lilianweng.github.io/posts/2023-06-23-agent/",
  {
    selector: pTagSelector,
  }
);
const docs = await cheerioLoader.load();

console.assert(docs.length === 1);
console.log(`Total characters: ${docs[0].pageContent.length}`);

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
});
const allSplits = await splitter.splitDocuments(docs);
console.log(`Split blog post into ${allSplits.length} sub-documents.`);

await vectorStore.addDocuments(allSplits);

const promptTemplate = await pull<ChatPromptTemplate>("rlm/rag-prompt");

const example_prompt = await promptTemplate.invoke({
  context: "(context goes here)",
  question: "(question goes here)",
});

const example_messages = example_prompt.messages;

console.assert(example_messages.length === 1);
console.log(example_messages[0].content);

const InputStateAnnotation = Annotation.Root({
  question: Annotation<string>,
});

const StateAnnotation = Annotation.Root({
  question: Annotation<string>,
  context: Annotation<Document[]>,
  answer: Annotation<string>,
});

const retrieve = async (state: typeof InputStateAnnotation.State) => {
  const retrievedDocs = await vectorStore.similaritySearch(state.question);
  return { context: retrievedDocs };
};

const generate = async (state: typeof StateAnnotation.State) => {
  const docsContent = state.context.map((doc) => doc.pageContent).join("\n");
  const prompt = await promptTemplate.invoke({
    question: state.question,
    context: docsContent,
  });
  const response = await llm.invoke(prompt);
  return { answer: response.content };
};

const graph = new StateGraph(StateAnnotation)
  .addNode("retrieve", retrieve)
  .addNode("generate", generate)
  .addEdge(START, "retrieve")
  .addEdge("retrieve", "generate")
  .addEdge("generate", END)
  .compile();

let input = { question: "What is Task Decomposition?" };
const result = await graph.invoke(input);

console.log(`\nQuestion: ${result["question"]}`);
console.log(`\nAnswer: ${result["answer"]}`);

// Query Analysis
const totalDocuments = allSplits.length;
const thirdDocuments = Math.floor(totalDocuments / 3);

allSplits.forEach((document, i) => {
  if (i < thirdDocuments) {
    document.metadata["section"] = "beginning";
  } else if (i < 2 * thirdDocuments) {
    document.metadata["section"] = "middle";
  } else {
    document.metadata["section"] = "end";
  }
});

const vectorStoreQA = new MemoryVectorStore(embeddings);
await vectorStoreQA.addDocuments(allSplits);

const searchSchema = z.object({
  query: z.string().describe("Search query to run."),
  section: z.enum(["beginning", "middle", "end"]).describe("Section to query."),
});
const srtucturedLlm = llm.withStructuredOutput(searchSchema);

const StateAnnotationQA = Annotation.Root({
  question: Annotation<string>,
  search: Annotation<z.infer<typeof searchSchema>>,
  context: Annotation<Document[]>,
  answer: Annotation<string>,
});

const analyzeQuery = async (state: typeof InputStateAnnotation.State) => {
  const result = await srtucturedLlm.invoke(state.question);
  return { search: result };
};

const retrieveQA = async (state: typeof StateAnnotationQA.State) => {
  const filter = (doc: Document) =>
    doc.metadata.section === state.search.section;
  const retrievedDocs = await vectorStore.similaritySearch(
    state.search.query,
    2,
    filter
  );
  return { context: retrievedDocs };
};

const generateQA = async (state: typeof StateAnnotationQA.State) => {
  const docsContent = state.context.map((doc) => doc.pageContent).join("\n");
  const prompt = await promptTemplate.invoke({
    question: state.question,
    context: docsContent,
  });
  const response = await llm.invoke(prompt);
  return { answer: response.content };
};

const graphQA = new StateGraph(StateAnnotationQA)
  .addNode("analyzeQuery", analyzeQuery)
  .addNode("retrieveQA", retrieveQA)
  .addNode("generateQA", generateQA)
  .addEdge(START, "analyzeQuery")
  .addEdge("analyzeQuery", "retrieveQA")
  .addEdge("retrieveQA", "generateQA")
  .addEdge("generateQA", END)
  .compile();

let inputQA = {
  question: "What does the end of the post say about Task Descomposition?",
};
console.log("Question:", inputQA.question);
console.log("\n=====\n");

for await (const chunk of await graphQA.stream(inputQA, {
  streamMode: "updates",
})) {
  console.log(chunk);
  console.log("\n====\n");
}
