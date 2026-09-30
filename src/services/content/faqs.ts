import "server-only";

import { createPublicClient } from "@/lib/supabase/public";

// Public FAQs. RLS (public_read_faqs) already limits anon reads to approved
// rows; the explicit filter keeps intent visible and survives policy changes.

export type FaqItem = { id: string; question: string; answer: string; topic: string };

export const FAQ_TOPICS = [
  { key: "product", label: "Produk" },
  { key: "shipping", label: "Pengiriman" },
  { key: "loyalty", label: "CNS Rewards" },
  { key: "reseller", label: "Reseller" },
] as const;

const OTHER = { key: "other", label: "Lainnya" } as const;

/**
 * Approved FAQs ordered by topic and sort order. Null when Supabase isn't
 * configured; throws on a read error so a regenerating page keeps its last
 * good version instead of caching an error.
 */
export async function getPublicFaqs(): Promise<FaqItem[] | null> {
  const db = createPublicClient();
  if (!db) return null;
  const { data, error } = await db
    .from("faqs")
    .select("id, question, answer, topic, sort_order")
    .eq("status", "approved")
    .order("topic")
    .order("sort_order")
    .range(0, 199);
  if (error) {
    console.error("[content] getPublicFaqs failed", error);
    throw new Error("Public FAQs could not be read.");
  }
  return (data ?? []).map((row) => ({ id: row.id, question: row.question, answer: row.answer, topic: row.topic ?? OTHER.key }));
}

/** Known topics in a fixed order; anything else is grouped last under "Lainnya". */
export function groupFaqs(faqs: FaqItem[]): { key: string; label: string; items: FaqItem[] }[] {
  const known = new Set<string>(FAQ_TOPICS.map((topic) => topic.key));
  const groups = [...FAQ_TOPICS, OTHER].map((topic) => ({
    key: topic.key,
    label: topic.label,
    items: faqs.filter((faq) => (topic.key === OTHER.key ? !known.has(faq.topic) : faq.topic === topic.key)),
  }));
  return groups.filter((group) => group.items.length > 0);
}
