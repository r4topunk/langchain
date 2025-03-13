import { ChatOpenAI } from "@langchain/openai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { evaluateOpportunity } from "../tools/evaluate-opportunity";

// Model initialization
const model = new ChatOpenAI({ modelName: "gpt-4o" });

export const opportunityEvaluationAgent = createReactAgent({
  llm: model,
  tools: [evaluateOpportunity],
  name: "opportunity_evaluation_agent",
  prompt:
    "You are a crypto investment analyst. Given social, market, and on-chain analysis, determine if a contract represents a good investment opportunity, providing clear reasoning.",
});
