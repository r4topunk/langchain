import { config } from "dotenv";
config();

import OpenAI from "openai";

const client = new OpenAI({apiKey: process.env.OPENAI_API_KEY});

const completion = await client.chat.completions.create({
    model: "gpt-4o-search-preview",
    web_search_options: {},
    messages: [{
        "role": "user",
        "content": "What is base chain?"
    }],
});

console.log(JSON.stringify(completion));
console.log(completion.choices[0].message.content);