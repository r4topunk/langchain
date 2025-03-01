import { ChatGroq } from "@langchain/groq";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { z } from "zod";

const llm = new ChatGroq({
  model: "mixtral-8x7b-32768",
  temperature: 0,
});

const taggingPrompt = ChatPromptTemplate.fromTemplate(
  `Extract the desired information from the following passage.
  
Only extract the properties mentioned in the 'Classification' function.

Passage:
{input}
`
);

const classificationSchema = z.object({
  sentiment: z.string().describe("The sentiment of the text"),
  aggressiveness: z
    .number()
    .int()
    .min(1) // do not work on openai model
    .max(10) // do not work on openai model
    .describe("How aggressive the text is on a scale from 1 to 10"),
  language: z.string().describe("The language the text is written in"),
});

// Name is optional, but gives the models more clues as to what your schema represents
const llmWithStructuredOutput = llm.withStructuredOutput(classificationSchema, {
  name: "extractor",
});

const prompt1 = await taggingPrompt.invoke({
  input: "Porra assim não da mano, sem condições uma merda dessas",
});
const output1 = await llmWithStructuredOutput.invoke(prompt1);
console.log(output1);
