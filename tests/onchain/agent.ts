import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { HumanMessage } from "@langchain/core/messages";
import { MemorySaver } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";

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
    messages: [
      new HumanMessage(
        "search about this token on base for me: 0x290f057a2c59b95d8027aa4abf31782676502071"
      ),
    ],
  },
  { configurable: { thread_id: "42" } }
);

console.log(
  "response 1 =>",
  agentFinalState.messages[agentFinalState.messages.length - 1].content
);
