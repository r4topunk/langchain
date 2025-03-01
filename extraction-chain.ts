import { z } from "zod";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatGroq } from "@langchain/groq";
import { ChatOpenAI } from "@langchain/openai";

const personSchema = z.object({
  name: z.optional(z.string()).describe("The name of the person"),
  hair_color: z
    .optional(z.string())
    .describe("The color of the person's hair if know"),
  height_in_meters: z.number().nullish().describe("Height measured in meters"),
});

const person = personSchema;
const dataSchema = z.object({
  people: z.array(person).describe("Extracted data about people."),
});

const promptTemplate = ChatPromptTemplate.fromMessages([
  [
    "system",
    `You are an expert extraction algorithm.
Only extract relevant information from the text.
If you do not know the value of an attribute asked to extract, return null for the attribute's value!`,
  ],
  ["human", "{text}"],
]);

const llm = new ChatGroq({
  model: "mixtral-8x7b-32768",
  temperature: 0,
});

const structured_llm_1 = llm.withStructuredOutput(personSchema);
const prompt_1 = await promptTemplate.invoke({
  text: "Alan Smith is 1.83 tall and has blond hair.",
});
const result_1 = await structured_llm_1.invoke(prompt_1);
console.log({ result_1 });

const structured_llm_2 = llm.withStructuredOutput(personSchema, {
  name: "person",
});
const prompt_2 = await promptTemplate.invoke({
  text: "Alan Smith is 6 feet tall and has blond hair.",
});
const result_2 = await structured_llm_2.invoke(prompt_2);
console.log({ result_2 });

const llm_2 = new ChatOpenAI({
  model: "gpt-4o-mini",
  temperature: 0,
});

// Arrays do not work on Groq
const structured_llm_3 = llm_2.withStructuredOutput(dataSchema);
const prompt_3 = await promptTemplate.invoke({
  text: "My name is Jeff, my hair is black and i am 6 feet tall. Anna has the same color hair as me.",
});
const result_3 = await structured_llm_3.invoke(prompt_3);
console.log(result_3);
