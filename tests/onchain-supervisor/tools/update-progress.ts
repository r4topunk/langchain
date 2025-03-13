import { tool } from "@langchain/core/tools";
import { z } from "zod";

export const updateProgress = tool(
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
