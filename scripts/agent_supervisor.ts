import { ChatOpenAI } from "@langchain/openai";
import { createSupervisor } from "@langchain/langgraph-supervisor";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { prettyPrint } from "../functions/pretty-print";

const model = new ChatOpenAI({ modelName: "gpt-4o" });

// Create specialized agents
const add = tool(async (args) => args.a + args.b, {
  name: "add",
  description: "Add two numbers.",
  schema: z.object({
    a: z.number(),
    b: z.number(),
  }),
});

const multiply = tool(async (args) => args.a * args.b, {
  name: "multiply",
  description: "Multiply two numbers.",
  schema: z.object({
    a: z.number(),
    b: z.number(),
  }),
});

const webSearch = tool(
  async () => {
    return (
      "Here are the headcounts for each of the FAANG companies in 2024:\n" +
      "1. **Facebook (Meta)**: 67,317 employees.\n" +
      "2. **Apple**: 164,000 employees.\n" +
      "3. **Amazon**: 1,551,000 employees.\n" +
      "4. **Netflix**: 14,000 employees.\n" +
      "5. **Google (Alphabet)**: 181,269 employees."
    );
  },
  {
    name: "web_search",
    description: "Search the web for information.",
    schema: z.object({
      query: z.string(),
    }),
  }
);

const mathAgent = createReactAgent({
  llm: model,
  tools: [add, multiply],
  name: "math_expert",
  prompt: "You are a math expert. Always use one tool at a time.",
});

const researchAgent = createReactAgent({
  llm: model,
  tools: [webSearch],
  name: "research_expert",
  prompt:
    "You are a world class researcher with access to web search. Do not do any math.",
});

// Create supervisor workflow
const workflow = createSupervisor({
  agents: [researchAgent, mathAgent],
  llm: model,
  prompt:
    "You are a team supervisor managing a research expert and a math expert. " +
    "For current events, use research_agent. " +
    "For math problems, use math_agent.",
});

// Compile and run
export const app = workflow.compile();
const input = {
  messages: [
    {
      role: "user",
      content: "what's the combined headcount of the FAANG companies in 2024??",
    },
  ],
};
// const result = await app.invoke(input);

// for await (const step of await app.stream(input, {
//   streamMode: "values",
// })) {
//   const lastMessage = step.messages[step.messages.length - 1];
//   prettyPrint(lastMessage);
//   console.log("-----\n");
// }
