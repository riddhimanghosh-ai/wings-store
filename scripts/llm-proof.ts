import { createGroq } from "@ai-sdk/groq";
import { generateText } from "ai";

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });

async function main() {
  const t0 = Date.now();
  const res = await generateText({
    model: groq("openai/gpt-oss-120b"),
    prompt:
      'Reply with exactly this JSON and nothing else: {"proof":"live","sum":<the result of 8123*7>}',
  });
  console.log("text:      ", res.text.trim());
  console.log("modelId:   ", res.response?.modelId);
  console.log("usage:     ", JSON.stringify(res.usage));
  console.log("latency_ms:", Date.now() - t0);
}

main();
