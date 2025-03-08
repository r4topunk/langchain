import { Document } from "@langchain/core/documents";
import { createRetrieverTool } from "langchain/tools/retriever";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { SqlToolkit } from "langchain/agents/toolkits/sql";
import { MemorySaver } from "@langchain/langgraph";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatGroq } from "@langchain/groq";
import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { pull } from "langchain/hub";
import { SqlDatabase } from "langchain/sql_db";
import { QuerySqlTool } from "langchain/tools/sql";
import { DataSource } from "typeorm";
import { z } from "zod";
import { prettyPrint } from "../functions/pretty-print";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";

const datasource = new DataSource({
  type: "sqlite",
  database: "data/Chinook.db",
});

const db = await SqlDatabase.fromDataSourceParams({
  appDataSource: datasource,
});

const InputStateAnnotation = Annotation.Root({
  question: Annotation<string>,
});
const StateAnnotation = Annotation.Root({
  question: Annotation<string>,
  query: Annotation<string>,
  result: Annotation<string>,
  answer: Annotation<string>,
});

const llm = new ChatOpenAI({
  model: "gpt-4o-mini",
  temperature: 0,
});

const queryPromptTemplate = await pull<ChatPromptTemplate>(
  "langchain-ai/sql-query-system-prompt"
);

const queryOutput = z.object({
  query: z.string().describe("Syntactially valid SQL query."),
});

const structuredLlm = llm.withStructuredOutput(queryOutput);

const writeQuery = async (state: typeof InputStateAnnotation.State) => {
  const promptValue = await queryPromptTemplate.invoke({
    dialect: db.appDataSourceOptions.type,
    top_k: 10,
    table_info: await db.getTableInfo(),
    input: state.question,
  });
  const result = await structuredLlm.invoke(promptValue);
  return { query: result.query };
};

const executeQuery = async (state: typeof StateAnnotation.State) => {
  const executeQueryTool = new QuerySqlTool(db);
  const result = await executeQueryTool.invoke(state.query);
  return { result };
};

const generateAnswer = async (state: typeof StateAnnotation.State) => {
  const promptValue =
    "Given the following user question, corresponding SQL query, " +
    "and SQL result, answer the user question in one sentence.\n\n" +
    `Question: ${state.question}\n` +
    `SQL Query: ${state.query}\n` +
    `SQL Result: ${state.result}\n`;
  const response = await llm.invoke(promptValue);
  return { answer: response.content };
};

const graphBuilder = new StateGraph({
  stateSchema: StateAnnotation,
})
  .addNode("writeQuery", writeQuery)
  .addNode("executeQuery", executeQuery)
  .addNode("generateAnswer", generateAnswer)
  .addEdge(START, "writeQuery")
  .addEdge("writeQuery", "executeQuery")
  .addEdge("executeQuery", "generateAnswer")
  .addEdge("generateAnswer", END);

const inputs = { question: "How many employees are there?" };

const runMemoryGraph = async () => {
  const checkpointer = new MemorySaver();
  const graphWithInterrupt = graphBuilder.compile({
    checkpointer,
    interruptBefore: ["executeQuery"],
  });

  const threadConfig = {
    configurable: { thread_id: "1" },
    streamMode: "updates" as const,
  };

  console.log(inputs);
  console.log("\n====\n");
  for await (const step of await graphWithInterrupt.stream(
    inputs,
    threadConfig
  )) {
    console.log(step);
    console.log("\n====\n");
  }

  // Will log when the graph is interrupted, after `executeQuery`.
  console.log("---GRAPH INTERRUPTED---");

  for await (const step of await graphWithInterrupt.stream(
    null,
    threadConfig
  )) {
    console.log(step);
    console.log("\n====\n");
  }
};

const toolkit = new SqlToolkit(db, llm);
const tools = toolkit.getTools();

const systemPromptTemplate = await pull<ChatPromptTemplate>(
  "langchain-ai/sql-agent-system-prompt"
);

const systemMessage = await systemPromptTemplate.format({
  dialect: "SQLite",
  top_k: 5,
});

const runAgent = async () => {
  const agent = createReactAgent({
    llm,
    tools,
    stateModifier: systemMessage,
  });

  let inputs = {
    messages: [
      {
        role: "user",
        content: "Which country's customers spend the most?",
      },
    ],
  };

  for await (const step of await agent.stream(inputs, {
    streamMode: "values",
  })) {
    const lastMessage = step.messages[step.messages.length - 1];
    prettyPrint(lastMessage);
    console.log("-----\n");
  }

  let inputs_2 = {
    messages: [
      {
        role: "user",
        content: "Describe the playlistrack table",
      },
    ],
  };

  for await (const step of await agent.stream(inputs_2, {
    streamMode: "values",
  })) {
    const lastMessage = step.messages[step.messages.length - 1];
    prettyPrint(lastMessage);
    console.log("-----\n");
  }
};

const runVectorAgent = async () => {
  const queryAsList = async (
    database: any,
    query: string
  ): Promise<string[]> => {
    const res: Array<{ [key: string]: string }> = JSON.parse(
      await database.run(query)
    )
      .flat()
      .filter((el: any) => el != null);

    const justValues: Array<string> = res.map((item) =>
      Object.values(item)[0]
        .replace(/\b\d+\b/g, "")
        .trim()
    );
    return justValues;
  };

  let artists = await queryAsList(db, "SELECT Name FROM Artist");
  let albums = await queryAsList(db, "SELECT Title FROM Album");
  let properNouns = artists.concat(albums);

  const embeddings = new OpenAIEmbeddings({
    model: "text-embedding-3-large",
  });

  const vectorStore = new MemoryVectorStore(embeddings);

  const documents = properNouns.map(
    (text) => new Document({ pageContent: text })
  );
  await vectorStore.addDocuments(documents);

  const retriever = vectorStore.asRetriever(5);

  const retrieverTool = createRetrieverTool(retriever, {
    name: "searchProperNouns",
    description:
      "Use to look up values to filter on. Input is an approximate spelling " +
      "of the proper noun, output is valid proper nouns. Use the noun most " +
      "similar to the search.",
  });

  let suffix =
    "If you need to filter on a proper noun like a Name, you must ALWAYS first look up " +
    "the filter value using the 'searchProperNouns' tool! Do not try to " +
    "guess at the proper name - use this function to find similar ones.";

  const systemPrompt = systemMessage + suffix;

  const updatedTools = tools.concat(retrieverTool);

  const agent = createReactAgent({
    llm,
    tools: updatedTools,
    prompt: systemPrompt,
  });

  const input = {
    messages: [
      { role: "user", content: "How many albums does alis in chain have?" },
    ],
  };

  for await (const step of await agent.stream(input, {
    streamMode: "values",
  })) {
    const lastMessage = step.messages[step.messages.length - 1];
    prettyPrint(lastMessage);
    console.log("\n====\n");
  }
};

await runVectorAgent();
