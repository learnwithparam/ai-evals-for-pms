// One way to call a model. Replay returns the recorded reply, so the course, its checks and CI
// need no key.
import type { LanguageModel } from "ai";
import { API_KEY_VARIABLES, MODELS, PRICES, type Provider, provider, type Role } from "./models";

export type Reply = {
  text: string;
  provider: string;
  role: Role;
  inputTokens: number;
  outputTokens: number;
  costUsd: number | null;
};

type HostedProvider = Exclude<Provider, "replay" | "ollama">;

function requireApiKey(chosen: HostedProvider) {
  const keyVariable = API_KEY_VARIABLES[chosen];
  if (process.env[keyVariable]) return;
  throw new Error(
    `LLM_PROVIDER is ${chosen} but ${keyVariable} is not set. ` +
      "Add it to .env, or set LLM_PROVIDER=replay.",
  );
}

async function hostedModel(chosen: HostedProvider, modelId: string): Promise<LanguageModel> {
  requireApiKey(chosen);
  if (chosen === "anthropic") {
    const { anthropic } = await import("@ai-sdk/anthropic");
    return anthropic(modelId);
  }
  if (chosen === "openai") {
    const { openai } = await import("@ai-sdk/openai");
    return openai(modelId);
  }
  const { createOpenRouter } = await import("@openrouter/ai-sdk-provider");
  const openRouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });
  return openRouter(modelId);
}

// Ollama runs on the learner's own machine and speaks the same language as the OpenAI API.
async function ollamaModel(modelId: string): Promise<LanguageModel> {
  if (!modelId) throw new Error("LLM_PROVIDER is ollama but OLLAMA_MODEL is not set.");
  const { createOpenAI } = await import("@ai-sdk/openai");
  const ollama = createOpenAI({
    // biome-ignore lint/style/useNamingConvention: the OpenAI library names this option baseURL.
    baseURL: process.env.OLLAMA_URL ?? "http://localhost:11434/v1",
    apiKey: "ollama",
  });
  return ollama(modelId);
}

function costInUsd(chosen: Provider, role: Role, inputTokens: number, outputTokens: number) {
  // A model on your own machine costs nothing.
  if (chosen === "ollama") return 0;
  if (chosen === "replay") return null;
  const price = PRICES[MODELS[chosen][role]];
  // Without a listed price we cannot say what the call cost, so we say nothing.
  if (!price) return null;
  const [inputPrice, outputPrice] = price;
  return (inputTokens * inputPrice + outputTokens * outputPrice) / 1e6;
}

function recordedReply(role: Role, recorded: string): Reply {
  return {
    text: recorded,
    provider: "replay",
    role,
    inputTokens: 0,
    outputTokens: 0,
    costUsd: 0,
  };
}

// `recorded` is the reply replay mode returns. Every caller passes one, so replay never guesses.
export async function complete(role: Role, prompt: string, recorded: string): Promise<Reply> {
  const chosen = provider();
  if (chosen === "replay") return recordedReply(role, recorded);

  const modelId = MODELS[chosen][role];
  let model: LanguageModel;
  if (chosen === "ollama") model = await ollamaModel(modelId);
  else model = await hostedModel(chosen, modelId);

  const { generateText } = await import("ai");
  const result = await generateText({ model, prompt });
  const inputTokens = result.usage?.inputTokens ?? 0;
  const outputTokens = result.usage?.outputTokens ?? 0;
  return {
    text: result.text,
    provider: chosen,
    role,
    inputTokens,
    outputTokens,
    costUsd: costInUsd(chosen, role, inputTokens, outputTokens),
  };
}
