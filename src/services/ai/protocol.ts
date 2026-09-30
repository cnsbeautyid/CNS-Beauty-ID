import { z } from "zod";

// Wire protocol between /api/ai/chat and the concierge panel (SSE). Shared by
// server and client; contains no secrets and no provider details.

/** Product facts for recommendation cards. Always from the catalog, never from model text. */
export type AIProductCard = {
  slug: string;
  name: string;
  /** Whole rupiah from the backend. */
  price: number;
  compareAtPrice?: number;
  available: boolean;
  imageUrl?: string;
  shortDescription?: string;
};

export type ConciergeEvent =
  | { type: "meta"; conversationId: string | null }
  | { type: "status"; label: string }
  | { type: "text"; delta: string }
  | { type: "products"; items: AIProductCard[] }
  | { type: "handoff"; url: string | null }
  | { type: "unavailable"; message: string }
  | { type: "error"; message: string }
  | { type: "done" };

export function encodeEvent(event: ConciergeEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}

const cardSchema = z.object({
  slug: z.string(),
  name: z.string(),
  price: z.number(),
  compareAtPrice: z.number().optional(),
  available: z.boolean(),
  imageUrl: z.string().optional(),
  shortDescription: z.string().optional(),
});

const eventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("meta"), conversationId: z.string().nullable() }),
  z.object({ type: z.literal("status"), label: z.string() }),
  z.object({ type: z.literal("text"), delta: z.string() }),
  z.object({ type: z.literal("products"), items: z.array(cardSchema) }),
  z.object({ type: z.literal("handoff"), url: z.string().nullable() }),
  z.object({ type: z.literal("unavailable"), message: z.string() }),
  z.object({ type: z.literal("error"), message: z.string() }),
  z.object({ type: z.literal("done") }),
]);

/** Incremental SSE decoder: feed text chunks, get validated events. Unknown data is dropped. */
export function createEventDecoder(onEvent: (event: ConciergeEvent) => void) {
  let buffer = "";
  return (chunk: string) => {
    buffer += chunk;
    let boundary = buffer.indexOf("\n\n");
    while (boundary !== -1) {
      const frame = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      const data = frame
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart())
        .join("\n");
      if (data) {
        try {
          const parsed = eventSchema.safeParse(JSON.parse(data));
          if (parsed.success) onEvent(parsed.data as ConciergeEvent);
        } catch {
          // Malformed frame: ignore rather than break the conversation.
        }
      }
      boundary = buffer.indexOf("\n\n");
    }
  };
}

export const PAGE_TYPES = ["home", "shop", "product", "cart", "checkout", "account", "reseller", "other"] as const;

export const MAX_HISTORY = 20;
export const MAX_MESSAGE_LENGTH = 2000;

export const chatRequestSchema = z.object({
  conversationId: z.uuid().optional(),
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(MAX_MESSAGE_LENGTH) }))
    .min(1)
    .max(MAX_HISTORY)
    .refine((messages) => messages.at(-1)?.role === "user", "The last message must come from the user."),
  // Context only, never authorization: the server resolves identity itself.
  pageContext: z
    .object({
      pageType: z.enum(PAGE_TYPES),
      productSlug: z.string().regex(/^[a-z0-9-]{1,80}$/).optional(),
      productName: z.string().max(120).optional(),
    })
    .optional(),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;
