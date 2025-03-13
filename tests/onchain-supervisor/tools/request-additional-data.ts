import { tool } from "@langchain/core/tools";
import { z } from "zod";

export const requestAdditionalData = tool(
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
