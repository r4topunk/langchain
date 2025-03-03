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

const classificationSchema1 = z.object({
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
const llmWithStructuredOutput1 = llm.withStructuredOutput(
  classificationSchema1,
  {
    name: "extractor",
  }
);

const prompt1 = await taggingPrompt.invoke({
  input: "Porra assim não da mano, sem condições uma merda dessas",
});
const output1 = await llmWithStructuredOutput1.invoke(prompt1);
console.log("output1", output1);

const classificationSchema2 = z.object({
  sentiment: z.enum(["happy", "neutral", "sad"]),
  aggressivenes: z
    .number()
    .int()
    .min(1)
    .max(5)
    .describe(
      "Describes how aggressive the statement is, the higher the number the more aggressive"
    ),
  language: z
    .enum(["spanish", "english", "french", "german", "italian", "portuguese"])
    .describe("The language the text is written in"),
});

const llmWithStructuredOutput2 = llm.withStructuredOutput(
  classificationSchema2,
  { name: "extractor" }
);

const prompt2 = await taggingPrompt.invoke({
  input:
    "Estoy increiblemente contento de haberte conocido! Creo que seremos muy buenos amigos!",
});
const result2 = await llmWithStructuredOutput2.invoke(prompt2);
console.log("result2", result2);

const prompt3 = await taggingPrompt.invoke({
  input: "Estoy muy enojado con vos! Te voy a dar tu merecido!",
});
const result3 = await llmWithStructuredOutput2.invoke(prompt3);
console.log("result3", result3);

const prompt4 = await taggingPrompt.invoke({
  input: "Weather is ok here, I can go outside without much more than a coat",
});
const result4 = await llmWithStructuredOutput2.invoke(prompt4);
console.log("result4", result4);
