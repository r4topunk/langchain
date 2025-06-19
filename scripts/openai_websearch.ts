import { config } from "dotenv";
config();

import OpenAI from "openai";

const client = new OpenAI({apiKey: process.env.OPENAI_API_KEY});

const completion = await client.chat.completions.create({
    model: "gpt-4o-search-preview",
    web_search_options: {search_context_size: "high"},
    messages: [{
        "role": "user",
        "content": `\
You are an expert researcher and content curator. Your task is to perform a thorough web search and provide a comprehensive overview of the topic: bitcoin.

Please gather information on the following aspects:
- Core concepts and a clear, concise definition of the topic.
- Key historical milestones and a timeline of important events.
- Influential people, organizations, or projects associated with it.
- The current state and recent developments.
- Common criticisms or controversies.
- Related technologies or concepts.

Please structure the output in a clear, easy-to-digest format.`
    }],
});

// console.log(JSON.stringify(completion));
console.log(completion.choices[0].message.content);