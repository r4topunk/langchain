import { ChatOpenAI } from "@langchain/openai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { analyzeSocialSentiment } from "../tools/analyze-social-sentiment";
import { requestAdditionalData } from "../tools/request-additional-data";
import { updateProgress } from "../tools/update-progress";

// Model initialization
const model = new ChatOpenAI({ modelName: "gpt-4o" });

export const socialAnalysisAgent = createReactAgent({
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
