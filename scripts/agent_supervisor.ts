import { ChatOpenAI } from "@langchain/openai"
import { createSupervisor } from "@langchain/langgraph-supervisor"
import { createReactAgent } from "@langchain/langgraph/prebuilt"
import { tool } from "@langchain/core/tools"
import { z } from "zod"
import { prettyPrint } from "../functions/pretty-print"
import { TavilySearchResults } from "@langchain/community/tools/tavily_search"

const model = new ChatOpenAI({ modelName: "gpt-4o" })

// Create specialized agents
const add = tool(async (args) => args.a + args.b, {
  name: "add",
  description: "Add two numbers.",
  schema: z.object({
    a: z.number(),
    b: z.number(),
  }),
})

const multiply = tool(async (args) => args.a * args.b, {
  name: "multiply",
  description: "Multiply two numbers.",
  schema: z.object({
    a: z.number(),
    b: z.number(),
  }),
})

const mathAgent = createReactAgent({
  llm: model,
  tools: [add, multiply],
  name: "math_expert",
  prompt: "You are a math expert. Always use one tool at a time.",
})

const researchAgent = createReactAgent({
  llm: model,
  tools: [new TavilySearchResults()],
  name: "research_expert",
  prompt:
    "You are a world class researcher with access to web search. Do not do any math.",
})

const reviewerAgent = createReactAgent({
  llm: model,
  tools: [],
  name: "review_expert",
  prompt:
    "You are a world class research reviewer. Do not do any math or research. You should provide the best review for the content.",
})

// Create supervisor workflow
const workflow = createSupervisor({
  agents: [researchAgent, mathAgent, reviewerAgent],
  llm: model,
  prompt:
    "You are a team supervisor managing a research expert, a math expert and a review expert. " +
    "For current events, use research_agent. " +
    "For reviewing the research, use review_agent. " +
    "For math problems, use math_agent.",
})

// Compile and run
export const app = workflow.compile()
const input = {
  messages: [
    {
      role: "user",
      content: "what's the combined headcount of the FAANG companies in 2024??",
    },
  ],
}
// const result = await app.invoke(input);

for await (const step of await app.stream(input, {
  streamMode: "values",
})) {
  const lastMessage = step.messages[step.messages.length - 1]
  prettyPrint(lastMessage)
  console.log("-----\n")
}
