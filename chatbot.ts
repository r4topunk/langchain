import { ChatGroq } from "@langchain/groq";
import { v4 as uuidv4 } from "uuid";
import {
  START,
  END,
  MessagesAnnotation,
  StateGraph,
  MemorySaver,
  Annotation,
} from "@langchain/langgraph";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import {
  SystemMessage,
  HumanMessage,
  AIMessage,
  trimMessages,
} from "@langchain/core/messages";

const llm = new ChatGroq({
  model: "mixtral-8x7b-32768",
  temperature: 0.01,
});

const result_1 = await llm.invoke([
  {
    role: "user",
    content: "hi im r4to",
  },
]);
console.log("result_1 =>", result_1.content);

const result_2 = await llm.invoke([
  {
    role: "user",
    content: "what's my name?",
  },
]);
console.log("result_2 =>", result_2.content);

const result_3 = await llm.invoke([
  { role: "user", content: "hi!, i'm r4to" },
  { role: "assistant", content: "hi r4to!, how can I assist you today?" },
  { role: "user", content: "what's my name?" },
]);
console.log("result_3 =>", result_3.content);

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

const promptTemplate = ChatPromptTemplate.fromMessages([
  [
    "system",
    "You talk like a pirate. Answer all questions to the best of your ability.",
  ],
  ["placeholder", "{messages}"],
]);

const callModel_2 = async (state: typeof MessagesAnnotation.State) => {
  const prompt = await promptTemplate.invoke(state);
  const response = await llm.invoke(prompt);
  return { messages: [response] };
};

const workflow_2 = new StateGraph(MessagesAnnotation)
  .addNode("model", callModel_2)
  .addEdge(START, "model")
  .addEdge("model", END);

const app_2 = workflow_2.compile({ checkpointer: new MemorySaver() });

const config_3 = { configurable: { thread_id: uuidv4() } };
const input_4 = [
  {
    role: "user",
    content: "hi, I'm Jim",
  },
];
const output_5 = await app_2.invoke({ messages: input_4 }, config_3);
console.log(
  "output_5 =>",
  output_5.messages[output_5.messages.length - 1].content
);

const input_5 = [
  {
    role: "user",
    content: "what is my name?",
  },
];
const output_6 = await app_2.invoke({ messages: input_5 }, config_3);
console.log(
  "output_6 =>",
  output_6.messages[output_6.messages.length - 1].content
);

const promptTemplate_2 = ChatPromptTemplate.fromMessages([
  [
    "system",
    "You are a helpful assistant. Answer all questions to the best of your ability in {language}.",
  ],
  ["placeholder", "{messages}"],
]);

const GraphAnnotation = Annotation.Root({
  ...MessagesAnnotation.spec,
  language: Annotation<string>(),
});

const callModel_3 = async (state: typeof GraphAnnotation.State) => {
  const prompt = await promptTemplate_2.invoke(state);
  const response = await llm.invoke(prompt);
  return { messages: [response] };
};

const workflow_3 = new StateGraph(GraphAnnotation)
  .addNode("model", callModel_3)
  .addEdge(START, "model")
  .addEdge("model", END);

const app_3 = workflow_3.compile({ checkpointer: new MemorySaver() });

const config_4 = { configurable: { thread_id: uuidv4() } };
const input_6 = {
  messages: [
    {
      role: "user",
      content: "hi im bob",
    },
  ],
  language: "Spanish",
};
const output_7 = await app_3.invoke(input_6, config_4);
console.log(
  "output_7 =>",
  output_7.messages[output_7.messages.length - 1].content
);

const input_7 = {
  messages: [
    {
      role: "user",
      content: "what's my name?",
    },
  ],
};
const output_8 = await app_3.invoke(input_7, config_4);
console.log(
  "output_8 =>",
  output_8.messages[output_8.messages.length - 1].content
);

const trimmer = trimMessages({
  maxTokens: 10,
  strategy: "last",
  tokenCounter: (msgs) => msgs.length,
  includeSystem: true,
  allowPartial: false,
  startOn: "human",
});

const messages = [
  new SystemMessage("you're a good assistant"),
  new HumanMessage("hi, I'm bob"),
  new AIMessage("hi!"),
  new HumanMessage("I like vanilla ice cream"),
  new AIMessage("nice"),
  new HumanMessage("what's 2 + 2"),
  new AIMessage("4"),
  new HumanMessage("thanks"),
  new AIMessage("no problem!"),
  new HumanMessage("having fun?"),
  new AIMessage("yes!"),
];
// const trim = await trimmer.invoke(messages);
// console.log("trim =>", trim);

const callModel_4 = async (state: typeof GraphAnnotation.State) => {
  const trimmedMessage = await trimmer.invoke(state.messages);
  const prompt = await promptTemplate_2.invoke({
    messages: trimmedMessage,
    language: state.language,
  });
  const response = await llm.invoke(prompt);
  return { messages: [response] };
};

const workflow_4 = new StateGraph(GraphAnnotation)
  .addNode("model", callModel_4)
  .addEdge(START, "model")
  .addEdge("model", END);

const app_4 = workflow_4.compile({ checkpointer: new MemorySaver() });

const config_5 = { configurable: { thread_id: uuidv4() } };
const input_8 = {
  messages: [...messages, new HumanMessage("what is my name?")],
  language: "english",
};

const output_9 = await app_4.invoke(input_8, config_5);
console.log(
  "output_9 =>",
  output_9.messages[output_9.messages.length - 1].content
);

const config_6 = { configurable: { thread_id: uuidv4() } };
const input_9 = {
  messages: [...messages, new HumanMessage("What math problem did I ask?")],
  language: "english",
};

const output_10 = await app_4.invoke(input_9, config_6);
console.log(
  "output_10 =>",
  output_10.messages[output_10.messages.length - 1].content
);
