import { ChatOpenAI } from "@langchain/openai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { generateReport } from "../tools/generate-report";

// Model initialization
const model = new ChatOpenAI({ modelName: "gpt-4o" });

export const reportGenerationAgent = createReactAgent({
  llm: model,
  tools: [generateReport],
  name: "report_generation_agent",
  prompt:
    "You are responsible for creating comprehensive markdown reports. Compile all analysis data into a well-structured report that clearly presents the opportunity assessment.",
});
