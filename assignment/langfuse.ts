// Shared by the import and export scripts: one place that knows how to talk to Langfuse.
// The keys come from the environment, never from the command line, and are never printed.

const DEFAULT_HOST = "https://cloud.langfuse.com";

export const SCORE_NAME = "mobility-verdict";
export const QUEUE_NAME = "Lantern Trails golden set";

// The few fields of a Langfuse answer that these scripts read.
export type Answer = {
  status: number;
  json: {
    id?: string;
    version?: string;
    data?: { id?: string; traceId?: string; stringValue?: string; comment?: string }[];
    meta?: { totalPages?: number };
  };
};

export type Connection = { host: string; authorization: string };

export function connect(): Connection {
  const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
  const secretKey = process.env.LANGFUSE_SECRET_KEY;
  if (!publicKey || !secretKey) {
    console.error("The Langfuse keys are missing. Try next: add LANGFUSE_PUBLIC_KEY and");
    console.error("LANGFUSE_SECRET_KEY to your .env file, from Settings, API Keys in Langfuse.");
    process.exit(2);
  }
  const host = (process.env.LANGFUSE_HOST ?? DEFAULT_HOST).replace(/\/$/, "");
  const authorization = `Basic ${btoa(`${publicKey}:${secretKey}`)}`;
  return { host, authorization };
}

export async function callLangfuse(
  connection: Connection,
  method: "GET" | "POST",
  path: string,
  body?: unknown,
): Promise<Answer> {
  const response = await fetch(`${connection.host}${path}`, {
    method,
    headers: { authorization: connection.authorization, "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  const json = text ? JSON.parse(text) : {};
  return { status: response.status, json };
}
