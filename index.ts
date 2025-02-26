import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

const model = new ChatOpenAI({ model: "gpt-4" });

const messages = [
  new SystemMessage(
    "Translate the following from English into Brazilian Portuguese"
  ),
  new HumanMessage("hi!"),
];

const invoketion = await model.invoke(messages);
console.log(invoketion);
