import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { ChatOpenAI } from "@langchain/openai";
import {
  MemorySaver,
  StateGraph,
  MessagesAnnotation,
  START,
  END,
} from "@langchain/langgraph";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { createReactAgent, ToolNode } from "@langchain/langgraph/prebuilt";

const runSimpleAgent = async () => {
  // Define the tools for the agent to use
  const agentTools = [new TavilySearchResults({ maxResults: 3 })];
  const agentModel = new ChatOpenAI({ temperature: 0 });

  // Initialize memory to persist state between graph runs
  const agentCheckpointer = new MemorySaver();
  const agent = createReactAgent({
    llm: agentModel,
    tools: agentTools,
    checkpointSaver: agentCheckpointer,
  });

  //  Not it's time to use!
  const agentFinalState = await agent.invoke(
    {
      messages: [new HumanMessage("what is the current weather in sf")],
    },
    { configurable: { thread_id: "42" } }
  );

  console.log(
    "response 1 =>",
    agentFinalState.messages[agentFinalState.messages.length - 1].content
  );

  const agentNextState = await agent.invoke(
    { messages: [new HumanMessage("what about ny")] },
    { configurable: { thread_id: "42" } }
  );

  console.log(
    "\nresponse 2 =>",
    agentNextState.messages[agentNextState.messages.length - 1].content
  );
};

const runComplexAgent = async () => {
  // Define the tools for the agent to use
  const tools = [new TavilySearchResults({ maxResults: 3 })];
  const toolNode = new ToolNode(tools);

  // Create a model and give it access to the tools
  const model = new ChatOpenAI({
    model: "gpt-4o-mini",
    temperature: 0,
  }).bindTools(tools);

  // Define the function that determines whether to continue or not
  function shouldContinue({ messages }: typeof MessagesAnnotation.State) {
    const lastMessage = messages[messages.length - 1] as AIMessage;

    // If the LLM makes a tool call, then we route to the "tools" node
    if (lastMessage.tool_calls?.length) {
      return "tools";
    }

    // Otherwise, we stop (reply to the user) using special "__end__" node
    return END;
  }

  // Define the function that calls the model
  async function callModel(state: typeof MessagesAnnotation.State) {
    const response = await model.invoke(state.messages);

    // We return a list, bacause this will get added to the existing list
    return { messages: [response] };
  }

  // Define a new graph
  const workflow = new StateGraph(MessagesAnnotation)
    .addNode("agent", callModel)
    .addEdge(START, "agent")
    .addNode("tools", toolNode)
    .addEdge("tools", "agent")
    .addConditionalEdges("agent", shouldContinue);

  // Finally, we compile it into a LangChain Runnable
  const app = workflow.compile();

  // Use the agent
  const finalState = await app.invoke({
    messages: [new HumanMessage("what is the weather in sf")],
  });
  console.log(
    "response 1 =>",
    finalState.messages[finalState.messages.length - 1].content
  );

  const nextState = await app.invoke({
    // Including the messages from the previous run gives the LLM context
    // This way it knows we're asking about the weather  in NY
    messages: [...finalState.messages, new HumanMessage("what about ny")],
  });
  console.log(
    "\nresponse 2 =>",
    nextState.messages[nextState.messages.length - 1].content
  );
};

await runComplexAgent();
