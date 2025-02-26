import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatPromptTemplate } from "@langchain/core/prompts";

const model = new ChatOpenAI({ model: "gpt-4" });

const systemTemplate = "Translate the following from English into {language}";

const promptTemplate = ChatPromptTemplate.fromMessages([
  ["system", systemTemplate],
  ["user", "{text}"],
]);

const promptValue = await promptTemplate.invoke({
  language: "Brazilian Portuguese",
  text: "Hello, how are you?",
});

const invoketion = await model.invoke(promptValue);
console.log(invoketion);
