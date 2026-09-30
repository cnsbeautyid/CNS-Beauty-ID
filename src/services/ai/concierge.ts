import type { LLMClient } from "./llm";
import type { LLMMessage, LLMStreamEvent } from "./openai-stream";
import { buildContextNote, buildSystemPrompt, type CatalogHints } from "./prompt";
import type { ChatRequest, ConciergeEvent } from "./protocol";
import type { ToolContext, ToolRegistry } from "./tools";

export const MAX_TOOL_ROUNDS = 4;

function readReason(rawArguments: string): string {
  try {
    const parsed: unknown = JSON.parse(rawArguments);
    if (parsed && typeof parsed === "object" && "reason" in parsed && typeof parsed.reason === "string") return parsed.reason.slice(0, 300);
  } catch {
    // fall through
  }
  return "Pelanggan meminta bantuan tim";
}

export type ConciergeInput = {
  llm: Pick<LLMClient, "stream">;
  tools: ToolRegistry;
  history: ChatRequest["messages"];
  pageContext: ChatRequest["pageContext"];
  hints: CatalogHints;
  context: ToolContext;
  signal?: AbortSignal;
};

export type ConciergeResult = { text: string; usage: { input: number; output: number }; escalationReason?: string };

/**
 * One concierge turn: stream the model's answer, run the controlled tools it
 * asks for, feed results back, repeat (bounded). Yields UI events; returns the
 * final text for logging. Tool results go to the model only; the UI gets
 * product cards and handoff links from tool data, never from model text.
 */
export async function* runConcierge(input: ConciergeInput): AsyncGenerator<ConciergeEvent, ConciergeResult> {
  const note = buildContextNote(input.pageContext);
  const messages: LLMMessage[] = [
    { role: "system", content: buildSystemPrompt(input.hints) },
    ...(note ? [{ role: "system" as const, content: note }] : []),
    ...input.history.map((message) => ({ role: message.role, content: message.content }) as LLMMessage),
  ];
  const usage = { input: 0, output: 0 };
  let text = "";
  let escalationReason: string | undefined;

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    let roundText = "";
    let end: Extract<LLMStreamEvent, { type: "end" }> | undefined;

    for await (const event of input.llm.stream({ messages, tools: input.tools.definitions, signal: input.signal })) {
      if (event.type === "text") {
        roundText += event.delta;
        yield { type: "text", delta: event.delta };
      } else {
        end = event;
      }
    }
    text += roundText;
    if (end?.usage) {
      usage.input += end.usage.input;
      usage.output += end.usage.output;
    }

    const calls = end?.toolCalls ?? [];
    if (calls.length === 0) return { text, usage, escalationReason };

    messages.push({
      role: "assistant",
      content: roundText || null,
      tool_calls: calls.map((call) => ({ id: call.id, type: "function", function: { name: call.name, arguments: call.arguments } })),
    });
    for (const call of calls) {
      yield { type: "status", label: input.tools.statusLabel(call.name) };
      const outcome = await input.tools.run(call.name, call.arguments, input.context);
      if (outcome.products?.length) yield { type: "products", items: outcome.products };
      if (outcome.handoffUrl !== undefined) {
        escalationReason = readReason(call.arguments);
        yield { type: "handoff", url: outcome.handoffUrl };
      }
      messages.push({ role: "tool", tool_call_id: call.id, content: outcome.content });
    }
    if (roundText) {
      // Keep separate rounds readable in one bubble.
      text += "\n\n";
      yield { type: "text", delta: "\n\n" };
    }
  }

  const fallback = "Maaf, aku belum bisa menyelesaikan permintaan ini. Tim CNS Beauty siap membantu melalui WhatsApp.";
  yield { type: "text", delta: fallback };
  return { text: text + fallback, usage, escalationReason };
}
