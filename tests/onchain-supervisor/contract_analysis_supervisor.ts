import { ChatOpenAI } from "@langchain/openai";
import { createSupervisor } from "@langchain/langgraph-supervisor";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { MemorySaver } from "@langchain/langgraph";
import { FarcasterSearchTool } from "./tools/farcaster_search";

// Model initialization
const model = new ChatOpenAI({ modelName: "gpt-4o" });

// Validate Ethereum address
function isValidEthereumAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

// ==========================================
// DATA FETCHING TOOLS
// ==========================================

// Create real Farcaster search tool if API key is available
let farcasterTool: FarcasterSearchTool | undefined;
try {
  farcasterTool = new FarcasterSearchTool();
} catch (error) {
  console.warn("Farcaster API key not found, using mock data instead.");
}

const farcasterFetch = tool(
  async (args) => {
    const { contractAddress } = args;

    if (!isValidEthereumAddress(contractAddress)) {
      return "Error: Invalid Ethereum contract address format";
    }

    try {
      // Use real API if available, otherwise use mock
      if (farcasterTool) {
        const result = await farcasterTool._call(contractAddress);
        return `Farcaster data for contract ${contractAddress}:\n${result}`;
      }

      // Mock data for demonstration
      return `
        Farcaster data for contract ${contractAddress}:
        - 127 mentions in the last 24 hours
        - Sentiment: 78% positive, 15% neutral, 7% negative
        - Key influencers discussing: @crypto_wizard, @defi_analyst, @nft_hunter
        - Common topics: "promising project", "innovative tokenomics", "strong community"
        - Recent activity spike: 3.2x increase in mentions since yesterday
      `;
    } catch (error) {
      return `Error fetching Farcaster data: ${
        error instanceof Error ? error.message : String(error)
      }`;
    }
  },
  {
    name: "farcaster_fetch",
    description: "Fetch social data about a contract from Farcaster.",
    schema: z.object({
      contractAddress: z
        .string()
        .describe("The Ethereum contract address to search for"),
    }),
  }
);

const coingeckoFetch = tool(
  async (args) => {
    const { contractAddress } = args;

    if (!isValidEthereumAddress(contractAddress)) {
      return "Error: Invalid Ethereum contract address format";
    }

    try {
      // Real API implementation would go here
      // const response = await fetch(`https://api.coingecko.com/api/v3/coins/ethereum/contract/${contractAddress}`);
      // if (!response.ok) throw new Error(`Coingecko API error: ${response.status}`);
      // const data = await response.json();

      // Mock data for demonstration
      return `
        Coingecko data for contract ${contractAddress}:
        - Current price: $0.0458
        - 24h change: +12.3%
        - 7d change: +45.7%
        - Market cap: $4,580,000
        - 24h volume: $1,250,000
        - Liquidity: $850,000
        - Launched: 14 days ago
        - Initial price: $0.0210
      `;
    } catch (error) {
      return `Error fetching Coingecko data: ${
        error instanceof Error ? error.message : String(error)
      }`;
    }
  },
  {
    name: "coingecko_fetch",
    description: "Fetch market data about a token from Coingecko.",
    schema: z.object({
      contractAddress: z
        .string()
        .describe("The Ethereum contract address to search for"),
    }),
  }
);

const etherscanFetch = tool(
  async (args) => {
    const { contractAddress } = args;

    if (!isValidEthereumAddress(contractAddress)) {
      return "Error: Invalid Ethereum contract address format";
    }

    try {
      // Real API implementation would go here
      // const apiKey = process.env.ETHERSCAN_API_KEY;
      // if (!apiKey) throw new Error("Etherscan API key not found");
      // const url = `https://api.etherscan.io/api?module=contract&action=getcontractinfo&address=${contractAddress}&apikey=${apiKey}`;
      // const response = await fetch(url);
      // if (!response.ok) throw new Error(`Etherscan API error: ${response.status}`);
      // const data = await response.json();

      // Mock data for demonstration
      return `
        Etherscan data for contract ${contractAddress}:
        - Contract verified: Yes
        - Created: 2024-05-01
        - Creator address: 0x7a2309a8f1E037ae65C295b4f7dBD24C496ab8B3
        - Total transactions: 5,827
        - Unique holders: 1,459
        - Top 10 holders concentration: 45.3%
        - Recent transaction volume: 325 ETH (24h)
        - Token standard: ERC-20
      `;
    } catch (error) {
      return `Error fetching Etherscan data: ${
        error instanceof Error ? error.message : String(error)
      }`;
    }
  },
  {
    name: "etherscan_fetch",
    description: "Fetch on-chain data about a contract from Etherscan.",
    schema: z.object({
      contractAddress: z
        .string()
        .describe("The Ethereum contract address to search for"),
    }),
  }
);

// ==========================================
// DATA ANALYSIS TOOLS
// ==========================================

const analyzeSocialSentiment = tool(
  async (args) => {
    const { socialData } = args;
    // This would be analysis logic using LLM
    return `
      Social Sentiment Analysis:
      - Overall sentiment is strongly positive with 78% positive mentions
      - Notable increase in discussion volume (3.2x) indicates growing interest
      - Engagement from established influencers suggests credibility
      - Key positive themes: innovative tokenomics, strong community
      - No significant red flags in community discussions
      - Recommendation: Social signals are POSITIVE
    `;
  },
  {
    name: "analyze_social_sentiment",
    description:
      "Analyze social data to determine sentiment and community interest.",
    schema: z.object({
      socialData: z.string().describe("Raw social data from Farcaster"),
    }),
  }
);

const analyzeMarketData = tool(
  async (args) => {
    const { marketData } = args;
    // This would be analysis logic using LLM
    return `
      Market Analysis:
      - Price performance is strong (+45.7% in 7 days)
      - Market cap of $4.58M indicates early-stage but established project
      - Healthy trading volume relative to market cap (27% ratio)
      - Liquidity is adequate for current market size
      - Price appreciation pattern appears sustainable rather than parabolic
      - ROI since launch is 118% in just 14 days
      - Recommendation: Market signals are POSITIVE
    `;
  },
  {
    name: "analyze_market_data",
    description:
      "Analyze market data to evaluate price performance and metrics.",
    schema: z.object({
      marketData: z.string().describe("Raw market data from Coingecko"),
    }),
  }
);

const analyzeOnChainData = tool(
  async (args) => {
    const { onChainData } = args;
    // This would be analysis logic using LLM
    return `
      On-Chain Analysis:
      - Contract is verified, increasing transparency and trustworthiness
      - Distribution of holders (1,459) is healthy for a 2-week old project
      - Top 10 wallet concentration (45.3%) is moderate but not concerning
      - Transaction activity indicates actual use rather than speculation only
      - Creator address has good reputation based on previous projects
      - No suspicious token movements detected
      - Recommendation: On-chain signals are POSITIVE
    `;
  },
  {
    name: "analyze_on_chain_data",
    description:
      "Analyze on-chain data to evaluate contract health and activity.",
    schema: z.object({
      onChainData: z.string().describe("Raw on-chain data from Etherscan"),
    }),
  }
);

const evaluateOpportunity = tool(
  async (args) => {
    const { socialAnalysis, marketAnalysis, onChainAnalysis } = args;
    // This would be evaluation logic using LLM
    return `
      Opportunity Evaluation:
      
      After reviewing all available data and analysis:
      
      - Social sentiment is positive with strong community engagement
      - Market performance shows healthy growth without excessive volatility
      - On-chain metrics indicate legitimate activity and reasonable distribution
      
      OVERALL ASSESSMENT: This appears to be a GOOD opportunity with a favorable risk/reward ratio.
      
      Key strengths:
      - Verified contract with transparent operations
      - Growing community with positive sentiment
      - Sustainable price growth rather than pump-and-dump pattern
      
      Potential risks:
      - Still an early-stage project with inherent volatility risk
      - Monitor top wallet concentration for potential large sell-offs
      
      Recommendation: Consider allocating a moderate position with defined stop-loss.
    `;
  },
  {
    name: "evaluate_opportunity",
    description:
      "Evaluate all analysis to determine if this is a good opportunity.",
    schema: z.object({
      socialAnalysis: z.string().describe("Analysis of social sentiment"),
      marketAnalysis: z.string().describe("Analysis of market data"),
      onChainAnalysis: z.string().describe("Analysis of on-chain data"),
    }),
  }
);

const generateReport = tool(
  async (args) => {
    const {
      contractAddress,
      socialData,
      marketData,
      onChainData,
      socialAnalysis,
      marketAnalysis,
      onChainAnalysis,
      opportunityEvaluation,
    } = args;

    return `
# Contract Analysis Report for ${contractAddress}

## Executive Summary

${opportunityEvaluation.split("OVERALL ASSESSMENT:")[1].split("\n\n")[0].trim()}

## Raw Data

### Social Data (Farcaster)
\`\`\`
${socialData.trim()}
\`\`\`

### Market Data (Coingecko)
\`\`\`
${marketData.trim()}
\`\`\`

### On-Chain Data (Etherscan)
\`\`\`
${onChainData.trim()}
\`\`\`

## Expert Analysis

### Social Sentiment Analysis
${socialAnalysis.trim()}

### Market Analysis
${marketAnalysis.trim()}

### On-Chain Analysis
${onChainAnalysis.trim()}

## Opportunity Assessment

${opportunityEvaluation.trim()}

## Disclaimer
This report is generated by AI agents and should not be considered financial advice.
All investments carry risk, and independent research is always recommended.

Report generated: ${new Date().toISOString()}
    `;
  },
  {
    name: "generate_report",
    description: "Generate a comprehensive markdown report of all findings.",
    schema: z.object({
      contractAddress: z.string(),
      socialData: z.string(),
      marketData: z.string(),
      onChainData: z.string(),
      socialAnalysis: z.string(),
      marketAnalysis: z.string(),
      onChainAnalysis: z.string(),
      opportunityEvaluation: z.string(),
    }),
  }
);

// Add a tool for requesting additional data if needed
const requestAdditionalData = tool(
  async (args) => {
    const { dataType, reason } = args;
    return `Request for additional ${dataType} data noted: ${reason}. Please provide this information to continue the analysis.`;
  },
  {
    name: "request_additional_data",
    description:
      "Request additional data when current information is insufficient.",
    schema: z.object({
      dataType: z
        .enum(["social", "market", "onchain", "other"])
        .describe("Type of additional data needed"),
      reason: z.string().describe("Why this additional data is needed"),
    }),
  }
);

// Add a tool for indicating analysis progress
const updateProgress = tool(
  async (args) => {
    const { stage, status } = args;
    console.log(`[PROGRESS] ${stage}: ${status}`);
    return `Analysis progress updated: ${stage} - ${status}`;
  },
  {
    name: "update_progress",
    description: "Update the progress of the analysis workflow.",
    schema: z.object({
      stage: z
        .enum([
          "data_collection",
          "data_analysis",
          "evaluation",
          "report_generation",
        ])
        .describe("Current stage of analysis"),
      status: z.string().describe("Status message for this stage"),
    }),
  }
);

// ==========================================
// AGENT CREATION
// ==========================================

// Data Fetcher Agents
const farcasterAgent = createReactAgent({
  llm: model,
  tools: [farcasterFetch, updateProgress],
  name: "farcaster_agent",
  prompt: `You are a specialized agent for retrieving social data from Farcaster about specific contracts.

IMPORTANT: 
1. First validate the contract address format (should be 0x followed by 40 hex characters)
2. Update the progress of your work using update_progress
3. Fetch social data using farcaster_fetch
4. Return comprehensive social sentiment information

If you encounter any errors, explain clearly what went wrong.`,
});

const coingeckoAgent = createReactAgent({
  llm: model,
  tools: [coingeckoFetch],
  name: "coingecko_agent",
  prompt:
    "You are a specialized agent for retrieving market data from Coingecko about crypto tokens. Given a contract address, fetch relevant market metrics and price data.",
});

const etherscanAgent = createReactAgent({
  llm: model,
  tools: [etherscanFetch],
  name: "etherscan_agent",
  prompt:
    "You are a specialized agent for retrieving on-chain data from Etherscan about Ethereum contracts. Given a contract address, fetch relevant contract details and transaction data.",
});

// Enhanced analysis agent with request capability
const socialAnalysisAgent = createReactAgent({
  llm: model,
  tools: [analyzeSocialSentiment, requestAdditionalData, updateProgress],
  name: "social_analysis_agent",
  prompt: `You are an expert in social media sentiment analysis for crypto projects.
  
IMPORTANT:
1. Update the progress of your analysis using update_progress
2. Analyze social data to determine community sentiment and engagement
3. If data is insufficient or contains errors, request additional data using request_additional_data
4. Provide a comprehensive analysis including sentiment polarity, key themes, and noteworthy discussion points`,
});

const marketAnalysisAgent = createReactAgent({
  llm: model,
  tools: [analyzeMarketData],
  name: "market_analysis_agent",
  prompt:
    "You are an expert in crypto market analysis. Given market data about a token, evaluate its performance metrics and provide insights about its market health.",
});

const onChainAnalysisAgent = createReactAgent({
  llm: model,
  tools: [analyzeOnChainData],
  name: "on_chain_analysis_agent",
  prompt:
    "You are an expert in blockchain data analysis. Given on-chain data about a contract, evaluate its transparency, holder distribution, and transaction patterns.",
});

// Evaluation Agent
const opportunityEvaluationAgent = createReactAgent({
  llm: model,
  tools: [evaluateOpportunity],
  name: "opportunity_evaluation_agent",
  prompt:
    "You are a crypto investment analyst. Given social, market, and on-chain analysis, determine if a contract represents a good investment opportunity, providing clear reasoning.",
});

// Report Generation Agent
const reportGenerationAgent = createReactAgent({
  llm: model,
  tools: [generateReport],
  name: "report_generation_agent",
  prompt:
    "You are responsible for creating comprehensive markdown reports. Compile all analysis data into a well-structured report that clearly presents the opportunity assessment.",
});

// ==========================================
// SUPERVISOR SETUP
// ==========================================

// Create supervisor workflow with enhanced prompt
const workflow = createSupervisor({
  agents: [
    farcasterAgent,
    coingeckoAgent,
    etherscanAgent,
    socialAnalysisAgent,
    marketAnalysisAgent,
    onChainAnalysisAgent,
    opportunityEvaluationAgent,
    reportGenerationAgent,
  ],
  llm: model,
  prompt: `You are a supervisor coordinating a team of specialized agents to analyze crypto contracts.

Your workflow is:
1. Receive a contract address
2. Delegate data collection to three fetcher agents: farcaster_agent, coingecko_agent, and etherscan_agent
3. Once data is collected, delegate analysis to three analyzer agents: social_analysis_agent, market_analysis_agent, and on_chain_analysis_agent
4. After all analyses are complete, delegate evaluation to the opportunity_evaluation_agent
5. Finally, instruct report_generation_agent to create the final markdown report using all collected data and analysis

IMPORTANT:
- First validate that the input contains a valid Ethereum address (0x followed by 40 hex characters)
- If any agent reports an error or insufficient data, work with them to address the issue before moving forward
- Wait for each agent to complete their work before moving to the next stage
- If an agent requests additional data, coordinate with the appropriate data fetcher agent
- Track the overall progress and ensure all necessary data is collected and analyzed
- Make sure each agent has the required input data before assigning tasks
- Maintain context throughout the workflow to ensure a comprehensive final report`,
  supervisorName: "God",
});

// ==========================================
// APPLICATION SETUP
// ==========================================

// Compile the workflow with memory
const checkpointer = new MemorySaver();
export const app = workflow.compile({ checkpointer });

// Function to run the analysis with improved error handling
export async function analyzeContract(contractAddress: string) {
  // Validate address format
  if (!isValidEthereumAddress(contractAddress)) {
    throw new Error(`Invalid Ethereum address format: ${contractAddress}`);
  }

  const input = {
    messages: [
      {
        role: "user",
        content: `Analyze this Ethereum contract and determine if it's a good opportunity: ${contractAddress}`,
      },
    ],
  };

  console.log(`Starting analysis for contract: ${contractAddress}`);
  console.log("------------------------------\n");

  try {
    const result = await app.invoke(input);
    return result;
  } catch (error) {
    console.error("Error during contract analysis:", error);
    throw error;
  }
}

// Function to run the analysis with streaming output and timeout
export async function analyzeContractWithStream(
  contractAddress: string,
  timeoutMs = 300000
) {
  // Validate address format
  if (!isValidEthereumAddress(contractAddress)) {
    throw new Error(`Invalid Ethereum address format: ${contractAddress}`);
  }

  const input = {
    messages: [
      {
        role: "user",
        content: `Analyze this Ethereum contract and determine if it's a good opportunity: ${contractAddress}`,
      },
    ],
  };

  console.log(`Starting analysis for contract: ${contractAddress}`);
  console.log("------------------------------\n");

  // Create a timeout promise
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error("Analysis timed out")), timeoutMs);
  });

  try {
    // Start the analysis stream
    const streamPromise = app.stream(input, {
      streamMode: "values",
      configurable: { thread_id: "1" },
    });

    // Race between the analysis and timeout
    const stream = (await Promise.race([
      streamPromise,
      timeoutPromise,
    ])) as AsyncIterable<any>;

    for await (const step of stream) {
      const lastMessage = step.messages[step.messages.length - 1];
      prettyPrint(lastMessage);
      console.log("-----\n");
    }
  } catch (error) {
    console.error("Error during contract analysis:", error);
    throw error;
  }
}

// Helper function to print messages nicely
function prettyPrint(message: any) {
  const type = message.type || message.role || "unknown";
  const content = message.content || JSON.stringify(message);

  console.log(`[${type}]\n${content}`);

  if (message.tool_calls && message.tool_calls.length > 0) {
    console.log("\nTool Calls:");
    message.tool_calls.forEach((tc: any) => {
      console.log(`- ${tc.name}(${JSON.stringify(tc.args)})`);
    });
  }
}

// Example usage
// if (require.main === module) {
//   // Run analysis for a sample contract
//   analyzeContractWithStream("0x1234567890123456789012345678901234567890").catch(
//     console.error
//   );
// }
