import type { Database } from "@/types/database";

type ReviewStatus = Database["public"]["Enums"]["content_status"];

/**
 * Claim governance (master prompt §17), backed by the database since
 * migration 20260929155121_product_claim_governance:
 * - product_benefits / product_faqs: RLS already returns only
 *   review_status = 'approved' to the public; checked again here.
 * - products.description / positioning: RLS cannot hide columns, so this
 *   is the gate. Shown only when products.copy_status = 'approved'.
 * Editing approved text in the DB resets it to 'pending_review'.
 */
export type ProductCopySource = {
  copyStatus: ReviewStatus;
  description: string | null;
  positioning: string | null;
  benefits: readonly { title: string; body: string | null; review_status: ReviewStatus }[];
  faqs: readonly { question: string; answer: string; review_status: ReviewStatus }[];
};

export type PublicProductCopy = {
  description?: string;
  positioning?: string;
  benefits: { title: string; body?: string }[];
  faqs: { question: string; answer: string }[];
};

export function selectPublicCopy(source: ProductCopySource): PublicProductCopy {
  const copyApproved = source.copyStatus === "approved";
  return {
    description: copyApproved ? (source.description ?? undefined) : undefined,
    positioning: copyApproved ? (source.positioning ?? undefined) : undefined,
    benefits: source.benefits
      .filter((benefit) => benefit.review_status === "approved")
      .map((benefit) => ({ title: benefit.title, body: benefit.body ?? undefined })),
    faqs: source.faqs
      .filter((faq) => faq.review_status === "approved")
      .map((faq) => ({ question: faq.question, answer: faq.answer })),
  };
}
