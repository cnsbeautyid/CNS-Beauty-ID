import "server-only";

import { getServerEnv } from "@/lib/env/server";

import { createCompletionAccumulator, splitSSE, type LLMMessage, type LLMStreamEvent, type LLMTool } from "./openai-stream";

export const LLM_PROVIDER = "nara";
const DEFAULT_MODEL = "agnes-2.5-flash";

export class LLMError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "LLMError";
  }
}

export type LLMClient = {
  model: string;
  stream(request: { messages: LLMMessage[]; tools: LLMTool[]; signal?: AbortSignal }): AsyncGenerator<LLMStreamEvent>;
};

/**
 * OpenAI-compatible streaming chat completions over fetch (owner decision:
 * the nara gateway, model agnes-2.5-flash). Server-only; the key never
 * reaches the browser. Null when the gateway isn't configured.
 */
export function createLLMClient(): LLMClient | null {
  const env = getServerEnv();
  if (!env.LLM_BASE_URL || !env.LLM_API_KEY) return null;
  const endpoint = `${env.LLM_BASE_URL.replace(/\/$/, "")}/chat/completions`;
  const apiKey = env.LLM_API_KEY;
  const model = env.LLM_MODEL ?? DEFAULT_MODEL;

  return {
    model,
    async *stream({ messages, tools, signal }) {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({ model, messages, tools, tool_choice: "auto", stream: true, temperature: 0.4, max_tokens: 1200 }),
        signal,
      });
      if (!response.ok || !response.body) throw new LLMError(`LLM request failed (${response.status})`, response.status);

      const accumulator = createCompletionAccumulator();
      const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        const { payloads, rest } = splitSSE(buffer + value);
        buffer = rest;
        for (const payload of payloads) {
          if (payload === "[DONE]") continue;
          let chunk: unknown;
          try {
            chunk = JSON.parse(payload);
          } catch {
            continue;
          }
          const delta = accumulator.push(chunk);
          if (delta) yield { type: "text", delta };
        }
      }
      yield accumulator.finish();
    },
  };
}
