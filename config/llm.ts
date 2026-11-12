// One way to call a model. Replay returns the recorded reply, so the course, its checks and CI need no key.
import { MODELS, KEYS, PRICES, provider, type Role } from "./models";

export type Reply = { text: string; provider: string; role: Role; inputTokens: number; outputTokens: number; costUsd: number | null };

async function modelFor(role: Role) {
  const p = provider();
  if (p === "replay") return null;
  if (p !== "ollama" && !process.env[KEYS[p]]) throw new Error(`LLM_PROVIDER is ${p} but ${KEYS[p]} is not set. Add it to .env, or set LLM_PROVIDER=replay.`);
  const id = MODELS[p][role];
  if (p === "anthropic") return (await import("@ai-sdk/anthropic")).anthropic(id);
  if (p === "openai") return (await import("@ai-sdk/openai")).openai(id);
  if (p === "openrouter") return (await import("@openrouter/ai-sdk-provider")).createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY })(id);
  if (!id) throw new Error("LLM_PROVIDER is ollama but OLLAMA_MODEL is not set.");
  return (await import("@ai-sdk/openai")).createOpenAI({ baseURL: process.env.OLLAMA_URL ?? "http://localhost:11434/v1", apiKey: "ollama" })(id);
}

// `recorded` is the reply replay mode returns. Every caller passes one, so replay never guesses.
export async function complete(role: Role, prompt: string, recorded: string): Promise<Reply> {
  const p = provider();
  const model = await modelFor(role);
  if (!model) return { text: recorded, provider: "replay", role, inputTokens: 0, outputTokens: 0, costUsd: 0 };
  const { generateText } = await import("ai");
  const r = await generateText({ model, prompt });
  const inputTokens = r.usage?.inputTokens ?? 0, outputTokens = r.usage?.outputTokens ?? 0;
  const price = p === "ollama" ? undefined : PRICES[MODELS[p][role]];
  return { text: r.text, provider: p, role, inputTokens, outputTokens, costUsd: price ? (inputTokens * price[0] + outputTokens * price[1]) / 1e6 : p === "ollama" ? 0 : null };
}
