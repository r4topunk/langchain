import { ChatOpenAI } from "@langchain/openai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { analyzeMarketData } from "../tools/analyze-market-data";

// Model initialization
const model = new ChatOpenAI({ modelName: "gpt-4o" });

export const marketAnalysisAgent = createReactAgent({
  llm: model,
  tools: [analyzeMarketData],
  name: "market_analysis_agent",
  prompt:
    "You are an expert in crypto market analysis. Given market data about a token, evaluate its performance metrics and provide insights about its market health.",
});
