import { describe, expect, it } from "vitest";

import { selectPublicCopy, type ProductCopySource } from "@/services/catalog/claims";
import { whatsappUrl } from "@/lib/utils/whatsapp";

const source = (overrides: Partial<ProductCopySource> = {}): ProductCopySource => ({
  copyStatus: "draft",
  description: "Deskripsi contoh.",
  positioning: "Positioning contoh",
  benefits: [
    { title: "Manfaat A", body: "Penjelasan A", review_status: "approved" },
    { title: "Manfaat B", body: null, review_status: "draft" },
    { title: "Manfaat C", body: "Penjelasan C", review_status: "pending_review" },
  ],
  faqs: [
    { question: "Pertanyaan A?", answer: "Jawaban A", review_status: "archived" },
    { question: "Pertanyaan B?", answer: "Jawaban B", review_status: "approved" },
  ],
  ...overrides,
});

describe("selectPublicCopy", () => {
  it("hides description and positioning unless the copy is approved", () => {
    const result = selectPublicCopy(source());
    expect(result.description).toBeUndefined();
    expect(result.positioning).toBeUndefined();
  });

  it("shows description and positioning once approved", () => {
    const result = selectPublicCopy(source({ copyStatus: "approved" }));
    expect(result).toMatchObject({ description: "Deskripsi contoh.", positioning: "Positioning contoh" });
  });

  it("keeps only approved benefits and FAQs, even if RLS let others through", () => {
    const result = selectPublicCopy(source());
    expect(result.benefits).toEqual([{ title: "Manfaat A", body: "Penjelasan A" }]);
    expect(result.faqs).toEqual([{ question: "Pertanyaan B?", answer: "Jawaban B" }]);
  });

  it("returns empty lists when nothing is approved", () => {
    const result = selectPublicCopy(source({ benefits: [], faqs: [] }));
    expect(result).toEqual({ description: undefined, positioning: undefined, benefits: [], faqs: [] });
  });
});

describe("whatsappUrl", () => {
  it("builds a wa.me link with an encoded message", () => {
    expect(whatsappUrl("62812-3456 7890", "Halo & salam")).toBe("https://wa.me/6281234567890?text=Halo%20%26%20salam");
  });
});
