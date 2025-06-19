// import { config } from "dotenv";
// config();

import OpenAI from "openai";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { ChatOpenAI } from "@langchain/openai";
import { MemorySaver } from "@langchain/langgraph-checkpoint";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { HumanMessage } from "@langchain/core/messages";

const PROMPT = `You are an expert researcher and content curator. Your task is to perform a thorough web search and provide a comprehensive overview of the selected topic.

Please gather information on the following aspects:
- Core concepts and a clear, concise definition of the topic.
- Key historical milestones and a timeline of important events.
- Influential people, organizations, or projects associated with it.
- The current state and recent developments.
- Common criticisms or controversies.
- Related technologies or concepts.

Please structure the output in a clear, easy-to-digest format.`;

export const webSearchTool = tool(
  async ({ query }) => {
    console.log("Using websearch tool...")
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const completion = await client.chat.completions.create({
      model: "gpt-4o-search-preview",
      web_search_options: { search_context_size: "high" },
      messages: [
        {
          role: "system",
          content: PROMPT,
        },
        {
          role: "user",
          content: query,
        },
      ],
    });

    return `Search results: ${completion.choices[0].message.content}`;
  },
  {
    name: "web_search",
    description:
      "Search the web using gpt-4o-search-preview",
    schema: z.object({
      query: z.string().describe("search terms"),
    }),
  }
);

// Define the tools for the agent to use
const agentModel = new ChatOpenAI({ temperature: 0 });

// Initialize memory to persist state between graph runs
const agentCheckpointer = new MemorySaver();
const agent = createReactAgent({
  llm: agentModel,
  tools: [webSearchTool],
  checkpointSaver: agentCheckpointer,
});

//  Not it's time to use!
const agentFinalState = await agent.invoke(
  {
    messages: [
      new HumanMessage("what's the latest news on bitcoin?"),
    ],
  },
  { configurable: { thread_id: "42" } }
);

console.log(
  agentFinalState.messages[agentFinalState.messages.length - 1].content
);
