import { createEventDecoder, type ChatRequest, type ConciergeEvent } from "@/services/ai/protocol";

export class ChatHttpError extends Error {
  constructor(readonly status: number) {
    super(`Chat request failed (${status})`);
    this.name = "ChatHttpError";
  }
}

/** POSTs one turn to /api/ai/chat and feeds decoded SSE events to `onEvent`. */
export async function streamChat(body: ChatRequest, onEvent: (event: ConciergeEvent) => void, signal?: AbortSignal): Promise<void> {
  const response = await fetch("/api/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify(body),
    signal,
  });
  if (!response.ok || !response.body) throw new ChatHttpError(response.status);

  const decode = createEventDecoder(onEvent);
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    decode(value);
  }
}

/** Coarse page type for context when a page hasn't set a richer one. */
export function pageTypeFromPath(pathname: string): NonNullable<ChatRequest["pageContext"]>["pageType"] {
  if (pathname === "/") return "home";
  if (pathname.startsWith("/produk")) return "shop";
  if (pathname.startsWith("/cart")) return "cart";
  if (pathname.startsWith("/checkout")) return "checkout";
  if (pathname.startsWith("/account")) return "account";
  if (pathname.startsWith("/reseller")) return "reseller";
  if (pathname === "/beauty-concierge") return "concierge";
  return "other";
}
