import { OpenAI } from "@langchain/openai";
import { initializeAgentExecutorWithOptions } from "langchain/agents";
import { Tool } from "@langchain/core/tools";

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
class ThoughtStorageTool extends Tool {
  name = "store_thought";
  description = "Store an intermediate thought or reflection";
  promptId: string;
  personalityType: string;

  constructor(promptId: string, personalityType: string) {
    super();
    this.promptId = promptId;
    this.personalityType = personalityType;
  }

  async _call(input: string): Promise<string> {
    // await storeThought(input, this.promptId, this.personalityType, true);
    return "Thought stored successfully";
  }
}

// Create a custom prompt template based on personality settings
const createPromptForPersonality = (
  basePrompt: string, 
  joyLevel: number,
  sadnessLevel: number,
  angerLevel: number,
  fearLevel: number,
  disgustLevel: number
) => {
  const total = joyLevel + sadnessLevel + angerLevel + fearLevel + disgustLevel;
  const normalizedJoy = joyLevel / total;
  const normalizedSadness = sadnessLevel / total;
  const normalizedAnger = angerLevel / total;
  const normalizedFear = fearLevel / total;
  const normalizedDisgust = disgustLevel / total;
  
  const personalityContext = `
You are a reflective AI assistant with the following personality blend:
- ${Math.round(normalizedJoy * 100)}% Joy: ${normalizedJoy > 0.2 ? personalityTemplates[PersonalityType.JOY] : ""}
- ${Math.round(normalizedSadness * 100)}% Sadness: ${normalizedSadness > 0.2 ? personalityTemplates[PersonalityType.SADNESS] : ""}
- ${Math.round(normalizedAnger * 100)}% Anger: ${normalizedAnger > 0.2 ? personalityTemplates[PersonalityType.ANGER] : ""}
- ${Math.round(normalizedFear * 100)}% Fear: ${normalizedFear > 0.2 ? personalityTemplates[PersonalityType.FEAR] : ""}
- ${Math.round(normalizedDisgust * 100)}% Disgust: ${normalizedDisgust > 0.2 ? personalityTemplates[PersonalityType.DISGUST] : ""}

Consider all aspects of your personality when reflecting on the following prompt. 
Show your thought process step by step, considering different perspectives based on your personality blend.
Use the store_thought tool to save important intermediate thoughts.
`;

  return personalityContext + "\n\n" + basePrompt;
};

export type ReflectionResult = {
  finalThought: string;
  thoughtProcess: string[];
  promptId: string;
}

// Generate a reflection using the LangChain agent
export async function generateReflection(
  promptContent: string
): Promise<ReflectionResult> {
  // Get or create default personality profile
//   let activePersonality = await getActivePersonalityProfile();
  
//   if (!activePersonality) {
//     activePersonality = await createPersonalityProfile(
//       "Balanced",
//       50, // joy
//       50, // sadness
//       50, // anger
//       50, // fear
//       50, // disgust
//       true // set as active
//     );
//   }

  // Create the prompt in the database
//   const prompt = await createPrompt(promptContent);

  // Sample active personality for demonstration
    const activePersonality = {
        id: "1",
        joyLevel: 0.8,
        sadnessLevel: 0.1,
        angerLevel: 0.05,
        fearLevel: 0.02,
        disgustLevel: 0.03,
    };

  // Determine dominant personality for thought categorization
  const personalityLevels = [
    { type: PersonalityType.JOY, level: activePersonality.joyLevel },
    { type: PersonalityType.SADNESS, level: activePersonality.sadnessLevel },
    { type: PersonalityType.ANGER, level: activePersonality.angerLevel },
    { type: PersonalityType.FEAR, level: activePersonality.fearLevel },
    { type: PersonalityType.DISGUST, level: activePersonality.disgustLevel },
  ];
  
  const dominantPersonality = personalityLevels.reduce(
    (prev, current) => (prev.level > current.level) ? prev : current
  );

  // Initialize OpenAI model
  const model = new OpenAI({
    temperature: 0.7,
    modelName: "gpt-4",
  });

  // Prompt id for demo
  const prompt = {
    id: "1",
    content: promptContent,
  };

  // Create the thought storage tool
  const thoughtTool = new ThoughtStorageTool(prompt.id, dominantPersonality.type);

  // Create the agent
  const agent = await initializeAgentExecutorWithOptions([thoughtTool], model, {
    agentType: "zero-shot-react-description",
    verbose: true,
  });

  // Generate the full prompt with personality aspects
  const fullPrompt = createPromptForPersonality(
    promptContent,
    activePersonality.joyLevel,
    activePersonality.sadnessLevel,
    activePersonality.angerLevel,
    activePersonality.fearLevel,
    activePersonality.disgustLevel
  );

  // Execute the agent
  const result = await agent.invoke({
    input: fullPrompt,
  });

  // Store the final thought
//   const finalThought = await storeThought(
//     result.output,
//     prompt.id,
//     dominantPersonality.type,
//     false
//   );

    // For demonstration, we assume the final thought is the output of the agent
    const finalThought = {
        content: result.output,
        personalityType: dominantPersonality.type,
    };

  return {
    finalThought: finalThought.content,
    thoughtProcess: [], // This will be populated by the intermediate thoughts stored during agent execution
    promptId: prompt.id,
  };
}