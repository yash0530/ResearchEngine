// Two protocol adapters, plain fetch, no SDKs. The runner stores the exact
// request body we send (Brief.inputJson) — keep adapters returning it.

import type { ProviderProfile } from "../../config/providers";

export class ProviderError extends Error {}

export type CompletionResult = {
  text: string;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
  requestBody: unknown;
};

function resolveKey(name: string, profile: ProviderProfile): string {
  if (!profile.apiKeyEnv) return "";
  const key = process.env[profile.apiKeyEnv] ?? "";
  if (!key) {
    throw new ProviderError(`provider '${name}': env var ${profile.apiKeyEnv} is not set`);
  }
  return key;
}

async function post(url: string, headers: Record<string, string>, body: unknown, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function complete(
  name: string,
  profile: ProviderProfile,
  req: { system: string; user: string },
): Promise<CompletionResult> {
  const key = resolveKey(name, profile);
  const timeoutMs = profile.timeoutMs ?? 120_000;
  const base = profile.baseUrl.replace(/\/$/, "");

  if (profile.protocol === "anthropic") {
    const requestBody = {
      model: profile.model,
      max_tokens: profile.maxTokens,
      system: req.system,
      messages: [{ role: "user", content: req.user }],
    };
    const res = await post(
      `${base}/v1/messages`,
      { "x-api-key": key, "anthropic-version": "2023-06-01" },
      requestBody,
      timeoutMs,
    );
    if (res.status !== 200) {
      throw new ProviderError(`${name} ${res.status}: ${(await res.text()).slice(0, 300)}`);
    }
    const data = (await res.json()) as {
      content?: { type?: string; text?: string }[];
      usage?: { input_tokens?: number; output_tokens?: number };
      model?: string;
    };
    const text = (data.content ?? [])
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("");
    return {
      text,
      model: data.model ?? profile.model,
      inputTokens: data.usage?.input_tokens ?? null,
      outputTokens: data.usage?.output_tokens ?? null,
      requestBody,
    };
  }

  // openai_compat
  const tokenParam = profile.tokenParam ?? "max_tokens";
  const requestBody: Record<string, unknown> = {
    model: profile.model,
    [tokenParam]: profile.maxTokens,
    messages: [
      { role: "system", content: req.system },
      { role: "user", content: req.user },
    ],
  };
  if (profile.jsonMode) requestBody.response_format = { type: "json_object" };

  const headers: Record<string, string> = {};
  if (key) headers.Authorization = `Bearer ${key}`;

  const res = await post(`${base}/chat/completions`, headers, requestBody, timeoutMs);
  if (res.status !== 200) {
    throw new ProviderError(`${name} ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const data = (await res.json()) as {
    choices?: { message?: { content?: string | null } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
    model?: string;
  };
  return {
    text: data.choices?.[0]?.message?.content ?? "",
    model: data.model ?? profile.model,
    inputTokens: data.usage?.prompt_tokens ?? null,
    outputTokens: data.usage?.completion_tokens ?? null,
    requestBody,
  };
}
