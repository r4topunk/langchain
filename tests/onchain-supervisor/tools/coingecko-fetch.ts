import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { isValidEthereumAddress } from "../utils";

export const coingeckoFetch = tool(
  async (args) => {
    const { contractAddress } = args;

    if (!isValidEthereumAddress(contractAddress)) {
      return "Error: Invalid Ethereum contract address format";
    }

    try {
      // Real API implementation would go here
      // const response = await fetch(`https://api.coingecko.com/api/v3/coins/ethereum/contract/${contractAddress}`);
      // if (!response.ok) throw new Error(`Coingecko API error: ${response.status}`);
      // const data = await response.json();

      // Mock data for demonstration
      return `
        Coingecko data for contract ${contractAddress}:
        - Current price: $0.0458
        - 24h change: +12.3%
        - 7d change: +45.7%
        - Market cap: $4,580,000
        - 24h volume: $1,250,000
        - Liquidity: $850,000
        - Launched: 14 days ago
        - Initial price: $0.0210
      `;
    } catch (error) {
      return `Error fetching Coingecko data: ${
        error instanceof Error ? error.message : String(error)
      }`;
    }
  },
  {
    name: "coingecko_fetch",
    description: "Fetch market data about a token from Coingecko.",
    schema: z.object({
      contractAddress: z
        .string()
        .describe("The Ethereum contract address to search for"),
    }),
  }
);
