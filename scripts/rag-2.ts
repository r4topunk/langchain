import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import {
  AIMessage,
  BaseMessage,
  HumanMessage,
  isAIMessage,
  SystemMessage,
  ToolMessage,
} from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import {
  END,
  MemorySaver,
  MessagesAnnotation,
  START,
  StateGraph,
} from "@langchain/langgraph";
import {
  createReactAgent,
  ToolNode,
  toolsCondition,
} from "@langchain/langgraph/prebuilt";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import "cheerio";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { z } from "zod";

const llm = new ChatOpenAI({
  model: "gpt-4o-mini",
  temperature: 0,
});

const embeddings = new OpenAIEmbeddings({
  model: "text-embedding-3-large",
});

const vectorStore = new MemoryVectorStore(embeddings);

// Load and chunk contents of the blog
const pTagSelector = "p";
const cheerioLoader = new CheerioWebBaseLoader(
  "https://lilianweng.github.io/posts/2023-06-23-agent/",
  {
    selector: pTagSelector,
  }
);

const docs = await cheerioLoader.load();

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
});
const allSplits = await splitter.splitDocuments(docs);
await vectorStore.addDocuments(allSplits);

// const graph = new StateGraph(MessagesAnnotation);

const retrieveSchema = z.object({ query: z.string() });
const retrieve = tool(
  async (input) => {
    const { query } = retrieveSchema.parse(input);
    const retrievedDocs = await vectorStore.similaritySearch(query, 2);
    const serialized = retrievedDocs
      .map(
        (doc) => `Source: ${doc.metadata.source}\nContent: ${doc.pageContent}`
      )
      .join("\n");
    return [serialized, retrievedDocs];
  },
  {
    name: "retrieve",
    description: "Retrieve information related to a query.",
    schema: retrieveSchema,
    responseFormat: "content_and_artifact",
  }
);

// Step 1: Generate an AIMessage that may include a tool-call to be sent
const queryOrRespond = async (state: typeof MessagesAnnotation.State) => {
  const llmWithTools = llm.bindTools([retrieve]);
  const response = await llmWithTools.invoke(state.messages);
  // MessagesState appends messages to state instead of overwriting
  return { messages: [response] };
};

// Step 2: Execute the retrieval
const tools = new ToolNode([retrieve]);

// Step 3: Generate a response using the retrieved content
const generate = async (state: typeof MessagesAnnotation.State) => {
  // Get generated ToolMessages
  let recentToolMessages = [];
  for (let i = state["messages"].length - 1; i >= 0; i--) {
    let message = state["messages"][i];
    if (message instanceof ToolMessage) {
      recentToolMessages.push(message);
    } else {
      break;
    }
  }

  const toolMessages = recentToolMessages.reverse();

  // Format into prompt
  const docsContent = toolMessages.map((doc) => doc.content).join("\n");
  const systemMessageContent =
    "You are an assistant for question-answering tasks. " +
    "Use the following pieces of retrieved context to answer " +
    "the question. If you don't know the answer, say that you " +
    "don't know. Use three sentences maximum and keep the " +
    "answer concise." +
    "\n\n" +
    `${docsContent}`;

  const conversationMessages = state.messages.filter(
    (message) =>
      message instanceof HumanMessage ||
      message instanceof SystemMessage ||
      (message instanceof AIMessage && message.tool_calls?.length == 0)
  );

  const prompt = [
    new SystemMessage(systemMessageContent),
    ...conversationMessages,
  ];

  const response = await llm.invoke(prompt);
  return { messages: [response] };
};

const graphBuilder = new StateGraph(MessagesAnnotation)
  .addNode("queryOrRespond", queryOrRespond)
  .addNode("tools", tools)
  .addNode("generate", generate)
  .addEdge(START, "queryOrRespond")
  .addConditionalEdges("queryOrRespond", toolsCondition, {
    __end__: END,
    tools: "tools",
  })
  .addEdge("tools", "generate")
  .addEdge("generate", END);

const graph = graphBuilder.compile();

const prettyPrint = (message: BaseMessage) => {
  let txt = `[${message.getType()}]\n${message.content}`;
  if ((isAIMessage(message) && message.tool_calls?.length) || 0 > 0) {
    const tool_calls = (message as AIMessage)?.tool_calls
      ?.map((tc) => `- ${tc.name}(${JSON.stringify(tc.args)})`)
      .join("\n");
    txt += `\nTools: \n${tool_calls}`;
  }
  console.log(txt);
};

let inputs1 = { messages: [{ role: "user", content: "Hello" }] };
for await (const step of await graph.stream(inputs1, {
  streamMode: "values",
})) {
  const lastMessage = step.messages[step.messages.length - 1];
  prettyPrint(lastMessage);
  console.log("-----\n");
}

let inputs2 = {
  messages: [{ role: "user", content: "What is Task Decomposition?" }],
};

for await (const step of await graph.stream(inputs2, {
  streamMode: "values",
})) {
  const lastMessage = step.messages[step.messages.length - 1];
  prettyPrint(lastMessage);
  console.log("-----\n");
}

const checkpointer = new MemorySaver();
const graphWithMemory = graphBuilder.compile({ checkpointer });

// Specify an ID for the thread
const threadConfig = {
  configurable: { thread_id: "abc123" },
  streamMode: "values" as const,
};

let inputs3 = {
  messages: [
    {
      role: "user",
      content: "What is Task Decomposition?",
    },
  ],
};
for await (const step of await graphWithMemory.stream(inputs3, threadConfig)) {
  const lastMessage = step.messages[step.messages.length - 1];
  prettyPrint(lastMessage);
  console.log("-----\n");
}

let inputs4 = {
  messages: [
    {
      role: "user",
      content: "Can you look up some common ways of doing it?",
    },
  ],
};
for await (const step of await graphWithMemory.stream(inputs4, threadConfig)) {
  const lastMessage = step.messages[step.messages.length - 1];
  prettyPrint(lastMessage);
  console.log("-----\n");
}

const agent = createReactAgent({ llm, tools: [retrieve] });
const inputMessage = `What is the standard method for Task Decomposition?
Once you the the answer, look up common extensions of that method.`;
let inputs5 = {
  messages: [
    {
      role: "user",
      content: inputMessage,
    },
  ],
};

for await (const step of await agent.stream(inputs5, {
  streamMode: "values",
})) {
  const lastMessage = step.messages[step.messages.length - 1];
  prettyPrint(lastMessage);
  console.log("-----\n");
}
