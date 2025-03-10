import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import "cheerio";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";

const pTagSelector = "p";
const cheerioLoader = new CheerioWebBaseLoader(
  "https://lilianweng.github.io/posts/2023-06-23-agent/",
  {
    selector: pTagSelector,
  }
);

const docs = await cheerioLoader.load();

const llm = new ChatOpenAI({
  model: "gpt-4o-mini",
  temperature: 0,
});

const prompt = PromptTemplate.fromTemplate(
  "Summarize the main theme in these retrieved docs: {context}"
);

const chain = await createStuffDocumentsChain({
  llm,
  outputParser: new StringOutputParser(),
  prompt,
});

const result = await chain.invoke({ context: docs });
console.log("result =>", result);
