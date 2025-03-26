import { HumanMessage } from "@langchain/core/messages";
import { v4 as uuidv4 } from 'uuid';
import { createReflectionAgent, generateReflection } from "./reflection";

async function runReflectionTest() {
  // Method 1: Using the agent directly
  console.log("=== Testing direct agent usage ===");
  const agent = createReflectionAgent(0.7, 0.1, 0.1, 0.05, 0.05);
  const threadId = uuidv4();
  
  const agentFinalState = await agent.invoke(
    {
      messages: [new HumanMessage("Reflect on the nature of artificial intelligence and its impact on society")],
    },
    {
      configurable: {
        thread_id: threadId
      }
    }
  );

  console.log(
    "Direct agent response =>",
    agentFinalState.messages[agentFinalState.messages.length - 1].content
  );

  // Method 2: Using the utility function
  console.log("\n=== Testing utility function ===");
  const reflection = await generateReflection(
    "Explore the future of remote work and its implications",
    uuidv4(), // Generate a new thread ID for this reflection
    0.2, // More balanced personality distribution
    0.2,
    0.2,
    0.2,
    0.2
  );
  
  console.log("Utility function response =>", reflection);
}

// Run the test
runReflectionTest().catch(console.error);