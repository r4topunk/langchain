import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatGroq } from "@langchain/groq";
import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { pull } from "langchain/hub";
import { SqlDatabase } from "langchain/sql_db";
import { QuerySqlTool } from "langchain/tools/sql";
import { DataSource } from "typeorm";
import { z } from "zod";

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

const llm = new ChatGroq({
  model: "mixtral-8x7b-32768",
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

const graph = graphBuilder.compile();

const inputs = { question: "How many employees are there?" };

console.log(inputs);
console.log("\n====\n");
for await (const step of await graph.stream(inputs, {
  streamMode: "updates",
})) {
  console.log(step);
  console.log("\n====\n");
}
