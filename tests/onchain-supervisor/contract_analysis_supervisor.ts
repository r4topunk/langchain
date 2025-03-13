import { ChatOpenAI } from "@langchain/openai";
import { createSupervisor } from "@langchain/langgraph-supervisor";
import { MemorySaver } from "@langchain/langgraph";

// Import all agents
import { dataFetcherAgent } from "./agents/data-fetcher";
import { socialAnalysisAgent } from "./agents/social-analysis";
import { marketAnalysisAgent } from "./agents/market-analysis";
import { onChainAnalysisAgent } from "./agents/on-chain-analysis";
import { opportunityEvaluationAgent } from "./agents/opportunity-evaluation";
import { reportGenerationAgent } from "./agents/report-generation";

// Model initialization
const model = new ChatOpenAI({ modelName: "gpt-4o" });

// ==========================================
// SUPERVISOR SETUP
// ==========================================

// Create supervisor workflow with enhanced prompt
const workflow = createSupervisor({
  agents: [
    dataFetcherAgent,
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
2. Delegate data collection to data_fetcher_agent to collect social, market and on-chain data
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

// Export function to analyze contracts with stream
export async function analyzeContractWithStream(
  contractAddress: string,
  timeoutMs: number = 5 * 60 * 1000
): Promise<void> {
  // @ts-ignore
  const stream = await app.stream({ input: contractAddress });

  const timeout = setTimeout(() => {
    throw new Error(`Analysis timed out after ${timeoutMs}ms`);
  }, timeoutMs);

  for await (const chunk of stream) {
    if (chunk.ops?.length) {
      for (const op of chunk.ops) {
        if (op.op === "add" && op.path.startsWith("/steps")) {
          const step = op.value;

          if (step.state?.value?.stdout) {
            console.log(step.state.value.stdout);
          } else if (step.state?.value) {
            console.log(JSON.stringify(step.state.value, null, 2));
          }
        }
      }
    }
  }

  clearTimeout(timeout);
}
