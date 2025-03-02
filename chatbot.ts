import { ChatGroq } from "@langchain/groq";

const llm = new ChatGroq({
  model: "mixtral-8x7b-32768",
  temperature: 0,
});

const result_1 = await llm.invoke([
  {
    role: "user",
    content: "hi im r4to",
  },
]);
console.log("result_1 =>", result_1.content);

const result_2 = await llm.invoke([
  {
    role: "user",
    content: "what's my name?",
  },
]);
console.log("result_2 =>", result_2.content);

const result_3 = await llm.invoke([
  { role: "user", content: "hi!, i'm r4to" },
  { role: "assistant", content: "hi r4to!, how can I assist you today?" },
  { role: "user", content: "what's my name?" },
]);
console.log("result_3 =>", result_3.content);
