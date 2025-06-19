import { config } from "dotenv";
config();

import OpenAI from "openai";
import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { ChatOpenAI } from "@langchain/openai";
import { MemorySaver } from "@langchain/langgraph";
import { HumanMessage } from "@langchain/core/messages";
import { createReactAgent } from "@langchain/langgraph/prebuilt";

const PROMPT = `You are an expert researcher and content curator. Your task is to perform a thorough web search and provide a comprehensive overview of the topic: bitcoin.

Please gather information on the following aspects:
- Core concepts and a clear, concise definition of the topic.
- Key historical milestones and a timeline of important events.
- Influential people, organizations, or projects associated with it.
- The current state and recent developments.
- Common criticisms or controversies.
- Related technologies or concepts.

Please structure the output in a clear, easy-to-digest format.`

console.log("*** OPENAI ***")

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const completion = await client.chat.completions.create({
  model: "gpt-4o-search-preview",
  web_search_options: { search_context_size: "high" },
  messages: [
    {
      role: "user",
      content: PROMPT,
    },
  ],
});

// console.log(JSON.stringify(completion));
console.log(completion.choices[0].message.content);

// ***
// Tavily
// ***

console.log("\n\n*** TAVILY ***")

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
      new HumanMessage(PROMPT),
    ],
  },
  { configurable: { thread_id: "42" } }
);

console.log(
  agentFinalState.messages[agentFinalState.messages.length - 1].content
);
