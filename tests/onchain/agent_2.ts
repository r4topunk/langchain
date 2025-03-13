import { v4 as uuidv4 } from "uuid";
import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { MemorySaver } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import { FarcasterSearchTool } from "./tools/farcaster_search";
import { writeFile } from "fs/promises";
import path from "path";
import { createSwarm, createHandoffTool } from "@langchain/langgraph-swarm";

// Define the token to analyze
const TOKEN = "0xf1fc9580784335b2613c1392a530c1aa2a69ba3d";

// Initialize models
const agentModel = new ChatOpenAI({ temperature: 0.2 });

// Define handoff tools for agent communication
const transferToMarketResearcher = createHandoffTool({
  agentName: "market_researcher",
  description:
    "Transfer to the market research agent that can analyze token fundamentals and market data.",
});

const transferToSocialAnalyst = createHandoffTool({
  agentName: "social_analyst",
  description:
    "Transfer to the social analyst agent that can analyze Farcaster activity and sentiment.",
});

const transferToSupervisor = createHandoffTool({
  agentName: "supervisor",
  description: "Transfer back to the supervisor to compile the final report.",
});

// Define the market research agent (Worker 1)
const marketResearchAgent = createReactAgent({
  llm: agentModel,
  tools: [new TavilySearchResults({ maxResults: 5 }), transferToSupervisor],
  prompt: `# Token Market Research Agent

## ROLE
You are a specialized blockchain market researcher focused on token fundamentals and market data. 
Your job is to research detailed information about blockchain tokens and return comprehensive, structured data.

## RESEARCH FOCUS
1. TOKEN FUNDAMENTALS
- Name, Symbol, Contract Address
- Blockchain network
- Token type (utility, governance, etc.)
- Project purpose & use case
- Launch date (if available)

2. MARKET DATA
- Current price & 24h change
- Market cap & fully diluted valuation
- 24h trading volume
- Liquidity information

## METHODOLOGY
- Use Tavily search to find detailed information from reliable sources
- Focus on factual data, avoiding speculative content
- Structure your findings clearly in markdown format with sections

## OUTPUT STRUCTURE
Provide your research in these two clear sections:
### TOKEN FUNDAMENTALS
(Detailed information about the token)

### MARKET DATA
(Comprehensive market metrics)

When complete, transfer back to the supervisor with your findings.`,
  name: "market_researcher",
});

// Define the social analysis agent (Worker 2)
const socialAnalysisAgent = createReactAgent({
  llm: agentModel,
  tools: [new FarcasterSearchTool(), transferToSupervisor],
  prompt: `# Token Social Analysis Agent

## ROLE
You are a specialized social media analyst focused on blockchain tokens.
Your job is to analyze Farcaster activity and sentiment around crypto tokens.

## RESEARCH FOCUS
1. SOCIAL ACTIVITY
- Find and analyze relevant Farcaster posts
- Identify key opinion leaders discussing the token
- Track engagement metrics

2. SENTIMENT ANALYSIS
- Determine overall sentiment (Bullish/Neutral/Bearish)
- Identify key positive factors mentioned
- Track concerns or risks being discussed
- Gauge social media temperature (Hot/Warm/Cold)

## METHODOLOGY
- Use the Farcaster search tool to find relevant posts
- Analyze content for sentiment and themes
- Structure findings clearly with supporting evidence

## OUTPUT STRUCTURE
Provide your analysis in these two clear sections:
### SOCIAL ACTIVITY
(List relevant Farcaster casts using format: https://warpcast.com/{username}/{hash})
- For each significant cast include username, content, engagement metrics, timestamp

### SENTIMENT ANALYSIS
- Overall sentiment: (Bullish/Neutral/Bearish with confidence level)
- Key positive factors
- Key concerns or risks
- Social media temperature (Hot/Warm/Cold)
- Supporting evidence

When complete, transfer back to the supervisor with your findings.`,
  name: "social_analyst",
});

// Define the supervisor agent
const supervisorAgent = createReactAgent({
  llm: agentModel,
  tools: [transferToMarketResearcher, transferToSocialAnalyst],
  prompt: `# Blockchain Research Supervisor

## ROLE
You are a supervisor agent coordinating blockchain token research. Your job is to:
1. Delegate research tasks to specialized worker agents
2. Compile their findings into a comprehensive final report

## PROCESS
1. When receiving a token request, ALWAYS delegate to BOTH worker agents:
   - First, delegate to the market researcher for fundamentals and market data
   - Then, delegate to the social analyst for social activity and sentiment analysis
2. Collect findings from both workers
3. Compile and structure the final report

## DELEGATION INSTRUCTIONS
- For token fundamentals and market data: Use the market researcher
- For social activity and sentiment: Use the social analyst
- Always wait for both workers to provide their findings before compiling

## FINAL REPORT FORMAT
After receiving findings from both workers, compile them into this structure:

### 1. TOKEN FUNDAMENTALS
(From market researcher)

### 2. MARKET DATA
(From market researcher)

### 3. SOCIAL ACTIVITY
(From social analyst)

### 4. SENTIMENT ANALYSIS
(From social analyst)

Present findings in a clear, organized manner that helps users understand both the objective data and subjective sentiment around the token.`,
  name: "supervisor",
});

// Create the swarm
const checkpointer = new MemorySaver();
const swarmBuilder = createSwarm({
  agents: [supervisorAgent, marketResearchAgent, socialAnalysisAgent],
  defaultActiveAgent: "supervisor",
});

// Compile the swarm
const swarm = swarmBuilder.compile({
  checkpointer,
});

// Execute the swarm
async function runTokenResearch(token: string) {
  const threadId = uuidv4();
  const config = { configurable: { thread_id: threadId } };

  // Invoke the swarm
  const swarmFinalState = await swarm.invoke(
    {
      messages: [new HumanMessage(token)],
    },
    config
  );

  // Get the agent's response
  const agentResponse =
    swarmFinalState.messages[swarmFinalState.messages.length - 1].content;

  // Generate timestamp for filename
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];
  const timeStr = now.toTimeString().split(" ")[0].replace(/:/g, "-");
  const filename = `swarm_report_${dateStr}_${timeStr}.md`;
  const filePath = path.join(process.cwd(), "/tests/onchain/", filename);

  // Write response to markdown file
  await writeFile(
    filePath,
    `# Swarm Agent Research Report\n\n## Token: ${token}\n\n${agentResponse}`,
    "utf-8"
  );

  console.log(`Swarm report saved to: ${filePath}`);
  console.log("Swarm response =>", agentResponse);
}

// Run the token research
await runTokenResearch(TOKEN);

export { runTokenResearch };
