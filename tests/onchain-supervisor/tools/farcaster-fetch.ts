import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { FarcasterSearchTool } from "../tools/farcaster_search";
import { isValidEthereumAddress } from "../utils";

// Create real Farcaster search tool if API key is available
let farcasterTool: FarcasterSearchTool | undefined;
try {
  farcasterTool = new FarcasterSearchTool();
} catch (error) {
  console.warn("Farcaster API key not found, using mock data instead.");
}

export const farcasterFetch = tool(
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
