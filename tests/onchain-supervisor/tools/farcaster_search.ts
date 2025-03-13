import { z } from "zod";
import { Tool } from "@langchain/core/tools";

// Define schema for cast author
const AuthorSchema = z.object({
  object: z.literal("user"),
  fid: z.number(),
  display_name: z.string(),
  profile: z
    .object({
      bio: z
        .object({
          text: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
  follower_count: z.number().optional(),
  following_count: z.number().optional(),
  power_badge: z.boolean().optional(),
});

// Define schema for reactions
const ReactionsSchema = z.object({
  likes_count: z.number(),
  recasts_count: z.number(),
});

// Define schema for replies
const RepliesSchema = z.object({
  count: z.number(),
});

// Define schema for a cast
const CastSchema = z.object({
  object: z.literal("cast"),
  hash: z.string(),
  author: AuthorSchema,
  thread_hash: z.string(),
  text: z.string(),
  timestamp: z.string(),
  reactions: ReactionsSchema,
  replies: RepliesSchema,
});

// Define schema for API response
const FarcasterResponseSchema = z.object({
  result: z.object({
    casts: z.array(CastSchema),
    next: z.object({
      cursor: z.string().nullable(),
    }),
  }),
});

// Define schema for clean output
const CleanCastSchema = z.object({
  hash: z.string(),
  author_name: z.string(),
  text: z.string(),
  timestamp: z.string(),
  likes: z.number(),
  replies: z.number(),
});

export class FarcasterSearchTool extends Tool {
  name = "farcaster_search";
  description =
    "Search for Farcaster casts related to a specific Ethereum contract address. Use this to find conversations about specific blockchain tokens or contracts.";

  constructor(private apiKey?: string) {
    super();
    this.apiKey = apiKey || process.env.NEYNAR_API_KEY;
    if (!this.apiKey) {
      throw new Error(
        "Neynar API key not found. Please set NEYNAR_API_KEY environment variable."
      );
    }
  }

  async _call(query: string): Promise<string> {
    try {
      // Format query to specifically look for the contract address
      const enhancedQuery = `ethereum contract ${query}`;

      const url = `https://api.neynar.com/v2/farcaster/cast/search?q=${encodeURIComponent(
        enhancedQuery
      )}&limit=15`;

      const options = {
        method: "GET",
        headers: {
          accept: "application/json",
          "x-api-key": this.apiKey as string,
        },
      };

      const response = await fetch(url, options);

      if (!response.ok) {
        throw new Error(
          `Failed to fetch from Farcaster API: ${response.status}`
        );
      }

      const rawData = await response.json();

      // Validate response with Zod
      const result = FarcasterResponseSchema.safeParse(rawData);

      if (!result.success) {
        throw new Error(`Invalid API response format: ${result.error.message}`);
      }

      // Transform casts to clean format
      const cleanCasts = result.data.result.casts.map((cast) => ({
        hash: cast.hash,
        author_name: cast.author.display_name,
        text: cast.text,
        timestamp: cast.timestamp,
        likes: cast.reactions.likes_count,
        replies: cast.replies.count,
      }));

      // Calculate sentiment metrics
      const totalCasts = cleanCasts.length;
      const mentionCount = totalCasts;

      // Simple sentiment analysis based on keywords
      let positiveCount = 0;
      let negativeCount = 0;

      const positiveKeywords = [
        "bullish",
        "good",
        "great",
        "promising",
        "moon",
        "gem",
        "profit",
        "potential",
      ];
      const negativeKeywords = [
        "scam",
        "rug",
        "ponzi",
        "bad",
        "avoid",
        "dump",
        "bearish",
        "risk",
      ];

      cleanCasts.forEach((cast) => {
        const text = cast.text.toLowerCase();

        if (positiveKeywords.some((keyword) => text.includes(keyword))) {
          positiveCount++;
        }

        if (negativeKeywords.some((keyword) => text.includes(keyword))) {
          negativeCount++;
        }
      });

      const neutralCount = totalCasts - positiveCount - negativeCount;

      // Calculate percentages
      const positivePercent =
        totalCasts > 0 ? Math.round((positiveCount / totalCasts) * 100) : 0;
      const negativePercent =
        totalCasts > 0 ? Math.round((negativeCount / totalCasts) * 100) : 0;
      const neutralPercent =
        totalCasts > 0 ? Math.round((neutralCount / totalCasts) * 100) : 0;

      // Find key influencers (by follower count)
      const keyInfluencers = result.data.result.casts
        .filter(
          (cast) =>
            cast.author.follower_count && cast.author.follower_count > 500
        )
        .map((cast) => `@${cast.author.display_name}`)
        .slice(0, 3)
        .join(", ");

      // Format the response
      return `
        Farcaster data summary:
        - ${mentionCount} mentions found
        - Sentiment: ${positivePercent}% positive, ${neutralPercent}% neutral, ${negativePercent}% negative
        - Key influencers discussing: ${keyInfluencers || "None identified"}
        - Recent cast highlights: ${cleanCasts
          .slice(0, 3)
          .map((c) => `"${c.text.substring(0, 50)}..."`)
          .join("; ")}
        
        Raw data: ${JSON.stringify({
          casts: cleanCasts,
          count: cleanCasts.length,
          sentiment: {
            positive: positivePercent,
            neutral: neutralPercent,
            negative: negativePercent,
          },
        })}
      `;
    } catch (error) {
      return `Error searching Farcaster: ${
        error instanceof Error ? error.message : String(error)
      }`;
    }
  }
}
