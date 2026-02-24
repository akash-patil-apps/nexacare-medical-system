/**
 * Generic LLM completion service (OpenAI- and Azure OpenAI–compatible).
 * Used only by server-side features (e.g. lab interpretation). Never expose keys to frontend.
 */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = (process.env.OPENAI_BASE_URL || "").replace(/\/$/, "");
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4";
const USE_AZURE = process.env.OPENAI_USE_AZURE === "true" || OPENAI_BASE_URL.includes("azure");

function getCompletionUrl(): string {
  if (!OPENAI_BASE_URL) return "";
  if (USE_AZURE) {
    return `${OPENAI_BASE_URL}/openai/deployments/${OPENAI_MODEL}/chat/completions?api-version=2024-02-15-preview`;
  }
  return `${OPENAI_BASE_URL}/v1/chat/completions`;
}

function getHeaders(): Record<string, string> {
  const key = OPENAI_API_KEY;
  if (!key) return {};
  if (USE_AZURE) {
    return { "api-key": key, "Content-Type": "application/json" };
  }
  return { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
}

/**
 * Call the LLM with a user prompt and optional system prompt.
 * Returns the assistant message content or throws on error/missing config.
 */
export async function complete(prompt: string, systemPrompt?: string): Promise<string> {
  const url = getCompletionUrl();
  const headers = getHeaders();

  if (!url || !OPENAI_API_KEY) {
    throw new Error("LLM is not configured: set OPENAI_API_KEY and OPENAI_BASE_URL (and OPENAI_MODEL if needed).");
  }

  const messages: { role: string; content: string }[] = [];
  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }
  messages.push({ role: "user", content: prompt });

  const body = USE_AZURE
    ? { messages }
    : { model: OPENAI_MODEL, messages };

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`LLM request failed (${res.status}): ${errText.slice(0, 300)}`);
  }

  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content;
  if (content == null) {
    throw new Error("LLM returned no content.");
  }
  return content;
}
