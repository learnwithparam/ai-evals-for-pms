// The only file that names a model. Code asks for a role (fast, smart, judge), never an id.
// Pick the provider with LLM_PROVIDER in a git-ignored .env file. The default, replay, needs no key.
// Ids follow briefs/MODELS.md in the curriculum repo, read from the live lists on 12 Nov 2026.

export type Role = "fast" | "smart" | "judge";
export type Provider = "replay" | "anthropic" | "openrouter" | "openai" | "ollama";
export const PROVIDERS: Provider[] = ["replay", "anthropic", "openrouter", "openai", "ollama"];

export const MODELS: Record<Exclude<Provider, "replay">, Record<Role, string>> = {
  anthropic: { fast: "claude-haiku-5-5", smart: "claude-sonnet-5-5", judge: "claude-haiku-5-5" },
  openrouter: {
    fast: "nvidia/nemotron-3.5-lightning",
    smart: "anthropic/claude-sonnet-5.5",
    judge: "anthropic/claude-haiku-5.5",
  },
  openai: { fast: "gpt-6-luna", smart: "gpt-6-luna-pro", judge: "gpt-6-luna" },
  ollama: {
    fast: process.env.OLLAMA_MODEL ?? "",
    smart: process.env.OLLAMA_MODEL ?? "",
    judge: process.env.OLLAMA_MODEL ?? "",
  },
};

// US dollars per million tokens, input and output, where the provider's list showed a price.
export const PRICES: Record<string, [number, number]> = {
  "nvidia/nemotron-3.5-lightning": [0.07, 0.2],
};

export const KEYS: Record<Exclude<Provider, "replay" | "ollama">, string> = {
  anthropic: "ANTHROPIC_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
  openai: "OPENAI_API_KEY",
};

export function provider(): Provider {
  const p = (process.env.LLM_PROVIDER ?? "replay").trim() as Provider;
  if (!PROVIDERS.includes(p))
    throw new Error(`LLM_PROVIDER is "${p}". Use one of: ${PROVIDERS.join(", ")}.`);
  return p;
}
