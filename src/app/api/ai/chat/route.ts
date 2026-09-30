import { randomUUID } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getSessionUser } from "@/lib/auth/session";
import { createRateLimiter } from "@/lib/utils/rate-limit";
import { whatsappUrl } from "@/lib/utils/whatsapp";
import { runConcierge } from "@/services/ai/concierge";
import { isConciergeEnabled, logMessage, markEscalated, resolveConversation } from "@/services/ai/conversation";
import { createLLMClient } from "@/services/ai/llm";
import { chatRequestSchema, encodeEvent, type ConciergeEvent } from "@/services/ai/protocol";
import { CONCIERGE_TOOLS } from "@/services/ai/tools";
import { getCatalogFacets } from "@/services/catalog/products";
import { getPublicContact } from "@/services/content/contact";

export const dynamic = "force-dynamic";

const ANONYMOUS_COOKIE = "cns_aid";
const MAX_BODY_BYTES = 64_000;
const limiter = createRateLimiter({ limit: 12, windowMs: 60_000 });

const UNAVAILABLE = "CNS Beauty AI sedang tidak tersedia. Tim CNS Beauty siap membantu melalui WhatsApp.";
const FAILED = "Maaf, terjadi kendala saat menyiapkan jawaban. Silakan coba lagi, atau hubungi tim kami.";

const reject = (status: number, error: string) => NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });

/**
 * Beauty Concierge chat (SSE). The browser sends the visible transcript and
 * page context; identity comes from the session cookie only, and every fact
 * comes from controlled tools. The LLM key never leaves the server.
 */
export async function POST(request: NextRequest) {
  // Same-origin only: the endpoint spends paid tokens.
  if (request.headers.get("origin") !== request.nextUrl.origin) return reject(403, "forbidden");
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) return reject(413, "too_large");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return reject(400, "invalid_json");
  }
  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) return reject(400, "invalid_request");

  const user = await getSessionUser();
  const storedId = request.cookies.get(ANONYMOUS_COOKIE)?.value;
  const anonymousId = storedId && z.uuid().safeParse(storedId).success ? storedId : randomUUID();
  if (!limiter.hit(user?.id ?? anonymousId)) return reject(429, "rate_limited");

  const llm = createLLMClient();
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: ConciergeEvent) => {
        try {
          controller.enqueue(encoder.encode(encodeEvent(event)));
        } catch {
          // Client went away; keep going so the turn is still logged.
        }
      };
      const handoff = async () => {
        const contact = await getPublicContact();
        send({ type: "handoff", url: contact?.whatsapp ? whatsappUrl(contact.whatsapp, "Halo CNS Beauty, saya butuh bantuan.") : null });
      };

      try {
        if (!llm || !(await isConciergeEnabled())) {
          send({ type: "meta", conversationId: null });
          send({ type: "unavailable", message: UNAVAILABLE });
          await handoff();
          return;
        }

        const { messages, pageContext, conversationId: requestedId } = parsed.data;
        const conversationId = await resolveConversation(
          requestedId,
          { userId: user?.id ?? null, anonymousId },
          { model: llm.model, pageType: pageContext?.pageType },
        );
        send({ type: "meta", conversationId });
        await logMessage(conversationId, { role: "user", content: messages.at(-1)?.content ?? "" });

        const facets = await getCatalogFacets();
        const startedAt = Date.now();
        const turn = runConcierge({
          llm,
          tools: CONCIERGE_TOOLS,
          history: messages,
          pageContext,
          hints: { concerns: facets?.concerns ?? [], skinTypes: facets?.skinTypes ?? [] },
          context: { userId: user?.id ?? null },
          signal: request.signal,
        });
        let step = await turn.next();
        while (!step.done) {
          send(step.value);
          step = await turn.next();
        }
        const result = step.value;
        await logMessage(conversationId, {
          role: "assistant",
          content: result.text,
          inputTokens: result.usage.input || undefined,
          outputTokens: result.usage.output || undefined,
          latencyMs: Date.now() - startedAt,
        });
        if (result.escalationReason) await markEscalated(conversationId, result.escalationReason);
      } catch (error) {
        if (!request.signal.aborted) {
          console.error("[ai] concierge turn failed", error);
          send({ type: "error", message: FAILED });
          await handoff();
        }
      } finally {
        send({ type: "done" });
        try {
          controller.close();
        } catch {
          // already closed
        }
      }
    },
  });

  const response = new NextResponse(stream, {
    headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-store, no-transform", "X-Accel-Buffering": "no" },
  });
  if (storedId !== anonymousId) {
    response.cookies.set(ANONYMOUS_COOKIE, anonymousId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return response;
}
