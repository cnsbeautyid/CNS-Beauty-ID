import { z } from "zod";

// Parsing for OpenAI-compatible streaming chat completions (the owner's
// nara gateway, Phase 9). Pure, so it is unit-tested without a network.

export type LLMToolCall = { id: string; name: string; arguments: string };

export type LLMMessage =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[] }
  | { role: "tool"; tool_call_id: string; content: string };

export type LLMTool = {
  type: "function";
  function: { name: string; description: string; parameters: Record<string, unknown> };
};

export type LLMStreamEvent =
  | { type: "text"; delta: string }
  | { type: "end"; toolCalls: LLMToolCall[]; finishReason: string | null; usage?: { input: number; output: number } };

const chunkSchema = z.object({
  choices: z
    .array(
      z.object({
        delta: z
          .object({
            content: z.string().nullish(),
            tool_calls: z
              .array(
                z.object({
                  index: z.number().int().nonnegative(),
                  id: z.string().nullish(),
                  function: z.object({ name: z.string().nullish(), arguments: z.string().nullish() }).nullish(),
                }),
              )
              .nullish(),
          })
          .nullish(),
        finish_reason: z.string().nullish(),
      }),
    )
    .default([]),
  usage: z.object({ prompt_tokens: z.number(), completion_tokens: z.number() }).nullish(),
});

/** Accumulates streamed deltas (text and fragmented tool calls) across chunks. */
export function createCompletionAccumulator() {
  const calls = new Map<number, { id: string; name: string; arguments: string }>();
  let finishReason: string | null = null;
  let usage: { input: number; output: number } | undefined;

  return {
    /** Returns the text delta in this chunk ("" if none). Ignores malformed chunks. */
    push(raw: unknown): string {
      const parsed = chunkSchema.safeParse(raw);
      if (!parsed.success) return "";
      if (parsed.data.usage) usage = { input: parsed.data.usage.prompt_tokens, output: parsed.data.usage.completion_tokens };
      let text = "";
      for (const choice of parsed.data.choices) {
        if (choice.finish_reason) finishReason = choice.finish_reason;
        if (choice.delta?.content) text += choice.delta.content;
        for (const fragment of choice.delta?.tool_calls ?? []) {
          const current = calls.get(fragment.index) ?? { id: "", name: "", arguments: "" };
          if (fragment.id) current.id = fragment.id;
          if (fragment.function?.name) current.name += fragment.function.name;
          if (fragment.function?.arguments) current.arguments += fragment.function.arguments;
          calls.set(fragment.index, current);
        }
      }
      return text;
    },
    finish(): Extract<LLMStreamEvent, { type: "end" }> {
      const toolCalls = [...calls.entries()]
        .sort(([a], [b]) => a - b)
        .map(([index, call]) => ({ ...call, id: call.id || `call_${index}` }))
        .filter((call) => call.name);
      return { type: "end", toolCalls, finishReason, usage };
    },
  };
}

/** Splits an SSE text buffer into complete `data:` payloads; returns the unconsumed rest. */
export function splitSSE(buffer: string): { payloads: string[]; rest: string } {
  const lines = buffer.split(/\r?\n/);
  const rest = lines.pop() ?? "";
  const payloads = lines.filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trim());
  return { payloads, rest };
}
