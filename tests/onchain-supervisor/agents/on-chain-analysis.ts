import { ChatOpenAI } from "@langchain/openai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { analyzeOnChainData } from "../tools/analyze-on-chain-data";

// Model initialization
const model = new ChatOpenAI({ modelName: "gpt-4o" });

export const onChainAnalysisAgent = createReactAgent({
  llm: model,
  tools: [analyzeOnChainData],
  name: "on_chain_analysis_agent",
  prompt:
    "You are an expert in blockchain data analysis. Given on-chain data about a contract, evaluate its transparency, holder distribution, and transaction patterns.",
});
