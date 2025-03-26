import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { HumanMessage } from "@langchain/core/messages";
import { MemorySaver } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import { Tool } from "@langchain/core/tools";

// Define personality types as a const object
export const PersonalityType = {
  JOY: "joy",
  SADNESS: "sadness",
  ANGER: "anger",
  FEAR: "fear",
  DISGUST: "disgust",
} as const;

// Personality templates for prompting
const personalityTemplates = {
  [PersonalityType.JOY]: 
    "You are a joyful, optimistic AI that sees the bright side of things. Your reflections should focus on positive aspects and opportunities.",
  [PersonalityType.SADNESS]: 
    "You are a melancholic, thoughtful AI that considers the deeper meaning of things. Your reflections should be introspective and note what might be lost or missed.",
  [PersonalityType.ANGER]: 
    "You are a passionate, determined AI that identifies injustice and problems. Your reflections should be direct and highlight things that need to change.",
  [PersonalityType.FEAR]: 
    "You are a cautious, careful AI that anticipates risks. Your reflections should consider what could go wrong and how to prepare.",
  [PersonalityType.DISGUST]: 
    "You are a discerning, critical AI that upholds standards. Your reflections should identify what's problematic and how to maintain integrity."
};

// Custom tool for storing thoughts
class ReflectionTool extends Tool {
  name = "generate_reflection";
  description = "Generate a reflection based on a prompt with different personality aspects";
  
  // Personality parameters
  joyLevel: number;
  sadnessLevel: number;
  angerLevel: number;
  fearLevel: number;
  disgustLevel: number;

  constructor(joyLevel = 0.2, sadnessLevel = 0.2, angerLevel = 0.2, fearLevel = 0.2, disgustLevel = 0.2) {
    super();
    this.joyLevel = joyLevel;
    this.sadnessLevel = sadnessLevel;
    this.angerLevel = angerLevel;
    this.fearLevel = fearLevel;
    this.disgustLevel = disgustLevel;
  }

  async _call(input: string): Promise<string> {
    // Create a personality blend message
    const personalityLevels = [
      { type: PersonalityType.JOY, level: this.joyLevel },
      { type: PersonalityType.SADNESS, level: this.sadnessLevel },
      { type: PersonalityType.ANGER, level: this.angerLevel },
      { type: PersonalityType.FEAR, level: this.fearLevel },
      { type: PersonalityType.DISGUST, level: this.disgustLevel },
    ];
    
    const total = personalityLevels.reduce((sum, item) => sum + item.level, 0);
    const normalizedLevels = personalityLevels.map(item => ({
      type: item.type,
      normalizedLevel: item.level / total
    }));
    
    const dominantPersonality = normalizedLevels.reduce(
      (prev, current) => (prev.normalizedLevel > current.normalizedLevel) ? prev : current
    );
    
    // Create context based on personality blend
    const personalityContext = normalizedLevels
      .filter(item => item.normalizedLevel > 0.2)
      .map(item => `${Math.round(item.normalizedLevel * 100)}% ${item.type}: ${personalityTemplates[item.type]}`)
      .join('\n');
    
    // Generate reflection based on the dominant personality
    const reflection = `
Reflection (dominant personality: ${dominantPersonality.type}):

I've considered this prompt through multiple perspectives:

${personalityContext}

Based on these considerations, here's my reflection:
${input}

This reflection combines elements of ${normalizedLevels
  .filter(item => item.normalizedLevel > 0.1)
  .map(item => item.type)
  .join(', ')}, with a primary emphasis on ${dominantPersonality.type}.
`;

    return reflection;
  }
}

// Function to create a reflection agent
export function createReflectionAgent(
  joyLevel = 0.8, 
  sadnessLevel = 0.1, 
  angerLevel = 0.05, 
  fearLevel = 0.02, 
  disgustLevel = 0.03
) {
  // Initialize tools
  const reflectionTool = new ReflectionTool(joyLevel, sadnessLevel, angerLevel, fearLevel, disgustLevel);
  const searchTool = new TavilySearchResults({ maxResults: 3 });
  const agentTools = [reflectionTool, searchTool];
  
  // Initialize model
  const agentModel = new ChatOpenAI({ 
    temperature: 0.7,
    modelName: "gpt-4o", // Updated to use a more current model
  });
  
  // Initialize memory saver for checkpointing
  const agentCheckpointer = new MemorySaver();

  // Create the agent with the reflection tool
  const agent = createReactAgent({
    llm: agentModel,
    tools: agentTools,
    checkpointSaver: agentCheckpointer,
    prompt: `You are a thoughtful reflection assistant that helps users explore ideas from different emotional perspectives.
You have access to a generate_reflection tool that creates reflections with different emotional tones.
If the user wants to explore a thought or idea, use the generate_reflection tool to provide insights.
You can also use web search when factual information would enhance the reflection.
Your goal is to help users gain new perspectives on their thoughts and ideas.`,
  });

  return agent;
}

// Generate a reflection using the agent
export async function generateReflection(
  promptContent: string,
  threadId: string,
  joyLevel = 0.8,
  sadnessLevel = 0.1,
  angerLevel = 0.05,
  fearLevel = 0.02,
  disgustLevel = 0.03
): Promise<string> {
  // Create the reflection agent
  const agent = createReflectionAgent(joyLevel, sadnessLevel, angerLevel, fearLevel, disgustLevel);
  
  // Invoke the agent with the prompt and thread_id
  const agentFinalState = await agent.invoke(
    {
      messages: [new HumanMessage(promptContent)],
    },
    {
      configurable: {
        thread_id: threadId
      }
    }
  );

  // Return the final message content
  const finalMessage = agentFinalState.messages[agentFinalState.messages.length - 1];
  const finalResponse = finalMessage.content.toString();
  return finalResponse;
}