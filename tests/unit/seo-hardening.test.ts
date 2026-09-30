import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/env/client", () => ({ clientEnv: { NEXT_PUBLIC_SITE_URL: "https://cnsbeauty.id" } }));

import { assertProductionSiteUrl } from "@/lib/env/site-url";
import { DEFAULT_SHARE_IMAGE, productShareMetadata, SHARE_DEFAULTS } from "@/lib/seo/share";

describe("productShareMetadata", () => {
  it("keeps the site name and locale and falls back to the branded card without product photos", () => {
    const meta = productShareMetadata({ name: "Serum", description: "Serum dari CNS Beauty.", images: [] });
    expect(meta.openGraph).toMatchObject({ ...SHARE_DEFAULTS, type: "website", title: "Serum", images: [DEFAULT_SHARE_IMAGE] });
    expect(meta.twitter).toEqual({ card: "summary_large_image", images: [DEFAULT_SHARE_IMAGE.url] });
  });

  it("uses the first product photo when there is one", () => {
    const meta = productShareMetadata({ name: "Serum", description: "d", images: [{ src: "https://x/a.webp", alt: "Serum" }, { src: "https://x/b.webp", alt: "b" }] });
    expect(meta.openGraph.images).toEqual([{ url: "https://x/a.webp", alt: "Serum" }]);
    expect(meta.twitter.images).toEqual(["https://x/a.webp"]);
  });
});

describe("assertProductionSiteUrl", () => {
  it("fails a production build whose site URL is localhost", () => {
    expect(() => assertProductionSiteUrl("production", "http://localhost:3000")).toThrow(/NEXT_PUBLIC_SITE_URL/);
    expect(() => assertProductionSiteUrl("production", undefined)).toThrow(/NEXT_PUBLIC_SITE_URL/);
  });

  it("allows real production URLs and any non-production build", () => {
    expect(() => assertProductionSiteUrl("production", "https://cnsbeauty.id")).not.toThrow();
    expect(() => assertProductionSiteUrl("preview", "http://localhost:3000")).not.toThrow();
    expect(() => assertProductionSiteUrl(undefined, undefined)).not.toThrow();
  });
});

describe("robots route", () => {
  it("is decided per request from the runtime environment", async () => {
    const route = await import("@/app/robots");
    expect(route.dynamic).toBe("force-dynamic");
  });
});
