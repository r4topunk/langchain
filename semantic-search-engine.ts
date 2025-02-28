import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { OpenAIEmbeddings } from "@langchain/openai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";

const embeddings = new OpenAIEmbeddings({
  model: "text-embedding-3-large",
});

const loader = new PDFLoader("./data/nke-10k-2023.pdf");
const docs = await loader.load();

const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
});

const allSplits = await textSplitter.splitDocuments(docs);

const vectorStore = new MemoryVectorStore(embeddings);
await vectorStore.addDocuments(allSplits);

console.log("Similatity Search:");
const results1 = await vectorStore.similaritySearch(
  "When was Nike incorporated?"
);
console.log(results1[0]);

console.log("Similarity Search With Score:");
const results2 = await vectorStore.similaritySearchWithScore(
  "What was Nike's revenue in 2023?"
);
console.log(results2[0]);

console.log("Similarity Search Vector With Score:");
const embedding = await embeddings.embedQuery(
  "How were Nike's margins impacted in 2023?"
);
const results3 = await vectorStore.similaritySearchVectorWithScore(
  embedding,
  1
);
console.log(results3);

console.log("Vector Store as Retriever batch query:");
const retriever = vectorStore.asRetriever({
  searchType: "mmr",
  searchKwargs: {
    fetchK: 1,
  },
});
const result4 = await retriever.batch([
  "When was Nike incorporated?",
  "What was Nike's revenue in 2023?",
]);
console.log(result4);
