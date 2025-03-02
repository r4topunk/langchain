import { ChatGroq } from "@langchain/groq";
import { v4 as uuidv4 } from "uuid";
import {
  START,
  END,
  MessagesAnnotation,
  StateGraph,
  MemorySaver,
} from "@langchain/langgraph";

const llm = new ChatGroq({
  model: "mixtral-8x7b-32768",
  temperature: 0.2,
});

// const result_1 = await llm.invoke([
//   {
//     role: "user",
//     content: "hi im r4to",
//   },
// ]);
// console.log("result_1 =>", result_1.content);

// const result_2 = await llm.invoke([
//   {
//     role: "user",
//     content: "what's my name?",
//   },
// ]);
// console.log("result_2 =>", result_2.content);

// const result_3 = await llm.invoke([
//   { role: "user", content: "hi!, i'm r4to" },
//   { role: "assistant", content: "hi r4to!, how can I assist you today?" },
//   { role: "user", content: "what's my name?" },
// ]);
// console.log("result_3 =>", result_3.content);

const callModel = async (state: typeof MessagesAnnotation.State) => {
  const response = await llm.invoke(state.messages);
  return { messages: response };
};

const workflow = new StateGraph(MessagesAnnotation)
  .addNode("model", callModel)
  .addEdge(START, "model")
  .addEdge("model", END);

const memory = new MemorySaver();
const app = workflow.compile({ checkpointer: memory });

const config_1 = { configurable: { thread_id: uuidv4() } };
console.log("config =>", config_1);

const input_1 = [
  {
    role: "user",
    content: "hi! I'm r4to",
  },
];
const output_1 = await app.invoke({ messages: input_1 }, config_1);
console.log(
  "output_1 =>",
  output_1.messages[output_1.messages.length - 1].content
);

const input_2 = [
  {
    role: "user",
    content: "what's my name?",
  },
];
const output_2 = await app.invoke({ messages: input_2 }, config_1);
console.log(
  "output_2 =>",
  output_2.messages[output_2.messages.length - 1].content
);

const config_2 = { configurable: { thread_id: uuidv4() } };
console.log("config_2 =>", config_2);

const input_3 = [
  {
    role: "user",
    content: "what's my name?",
  },
];
const output_3 = await app.invoke({ messages: input_3 }, config_2);
console.log(
  "output_3 =>",
  output_3.messages[output_3.messages.length - 1].content
);

const output_4 = await app.invoke({ messages: input_2 }, config_1);
console.log(
  "output_4 =>",
  output_4.messages[output_4.messages.length - 1].content
);
