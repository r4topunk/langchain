import { ChatOpenAI } from "@langchain/openai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { farcasterFetch } from "../tools/farcaster-fetch";
import { coingeckoFetch } from "../tools/coingecko-fetch";
import { etherscanFetch } from "../tools/etherscan-fetch";
import { updateProgress } from "../tools/update-progress";

// Model initialization
const model = new ChatOpenAI({ modelName: "gpt-4o" });

export const dataFetcherAgent = createReactAgent({
  llm: model,
  tools: [farcasterFetch, coingeckoFetch, etherscanFetch, updateProgress],
  name: "data_fetcher_agent",
  prompt: `You are a specialized agent for retrieving data about crypto contracts from multiple sources.

IMPORTANT: 
1. First validate the contract address format (should be 0x followed by 40 hex characters)
2. Update the progress of your work using update_progress
3. Fetch data from all available sources:
   - Social data using farcaster_fetch
   - Market data using coingecko_fetch
   - On-chain data using etherscan_fetch
4. Return all data in an organized format for analysis

If you encounter any errors with any data source, explain clearly what went wrong.`,
});
