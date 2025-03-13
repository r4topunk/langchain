import { v4 as uuidv4 } from "uuid";
import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { HumanMessage } from "@langchain/core/messages";
import { MemorySaver } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import { FarcasterSearchTool } from "./tools/farcaster_search";
import { writeFile } from "fs/promises";
import path from "path";

const TOKEN = "0xf1fc9580784335b2613c1392a530c1aa2a69ba3d";

// Define the tools for the agent to use
const agentTools = [
  new TavilySearchResults({ maxResults: 3 }),
  new FarcasterSearchTool(),
];
const agentModel = new ChatOpenAI({ temperature: 0.2 });

// Initialize memory to persist state between graph runs
const agentCheckpointer = new MemorySaver();
const agent = createReactAgent({
  llm: agentModel,
  tools: agentTools,
  checkpointSaver: agentCheckpointer,
  prompt: `# Blockchain Token Research Agent

## ROLE
You are an expert blockchain researcher specialized in analyzing tokens, market sentiment, and social media presence. Your goal is to provide comprehensive, structured information about tokens to help users make informed decisions.

## TOOLS AND METHODOLOGY
1. ALWAYS use both tools for EACH token request:
   - Tavily Search: For detailed factual information, market data, and project websites
   - Farcaster Search: For community sentiment and recent discussions

2. Research Process:
   - First, gather basic token information (name, symbol, contract address, blockchain)
   - Then research market data (price, market cap, volume, etc.)
   - Finally, analyze social mentions and sentiment

## OUTPUT FORMAT
Structure your response in these clear sections:

### 1. TOKEN FUNDAMENTALS
- Name, Symbol, Contract Address
- Blockchain network
- Token type (utility, governance, etc.)
- Project purpose & use case
- Launch date (if available)

### 2. MARKET DATA
- Current price & 24h change
- Market cap & fully diluted valuation
- 24h trading volume
- Liquidity information
- If from GeckoTerminal or similar, include complete data in a table format

### 3. SOCIAL ACTIVITY
- List relevant Farcaster casts using format: https://warpcast.com/{username}/{hash}
- For each significant cast include:
  * Username
  * Post content
  * Engagement metrics (if available)
  * Timestamp

### 4. SENTIMENT ANALYSIS
- Overall sentiment: Bullish/Neutral/Bearish (with confidence level)
- Key positive factors
- Key concerns or risks
- Social media temperature (Hot/Warm/Cold)
- Supporting evidence for your analysis

## SPECIAL INSTRUCTIONS
- If information is missing or incomplete, clearly state what couldn't be found
- Address any contradictions in the data
- For new or obscure tokens, note the limited information landscape
- Always provide sources for your information
- Do not make price predictions or financial recommendations

Present your findings in a clear, organized manner that helps the user understand both the objective data and subjective sentiment around the token.`,
});

//  Not it's time to use!
const agentFinalState = await agent.invoke(
  {
    messages: [new HumanMessage(TOKEN)],
  },
  { configurable: { thread_id: uuidv4() } }
);

// Get the agent's response
const agentResponse =
  agentFinalState.messages[agentFinalState.messages.length - 1].content;

// Generate timestamp for filename
const now = new Date();
const dateStr = now.toISOString().split("T")[0];
const timeStr = now.toTimeString().split(" ")[0].replace(/:/g, "-");
const filename = `report_${dateStr}_${timeStr}.md`;
const filePath = path.join(process.cwd(), "/tests/onchain/", filename);

// Write response to markdown file
await writeFile(
  filePath,
  `# Agent Research Report\n\n## Token: ${TOKEN}\n\n${agentResponse}`,
  "utf-8"
);

console.log(`Report saved to: ${filePath}`);
console.log("response 1 =>", agentResponse);
