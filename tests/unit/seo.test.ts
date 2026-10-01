import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/env/client", () => ({ clientEnv: { NEXT_PUBLIC_SITE_URL: "https://cnsbeauty.id" } }));

import { buildRobots, ROBOTS_DISALLOW } from "@/lib/seo/robots";
import { buildSitemap } from "@/lib/seo/sitemap";
import {
  absoluteUrl,
  breadcrumbJsonLd,
  faqPageJsonLd,
  organizationJsonLd,
  productJsonLd,
  websiteJsonLd,
} from "@/lib/seo/structured-data";
import type { ProductDetail } from "@/types/product";

const SITE = "https://cnsbeauty.id";

describe("buildRobots", () => {
  it("lets search engines in on production, except private areas, and points to the sitemap", () => {
    const robots = buildRobots(true, SITE);
    expect(robots.rules).toEqual({ userAgent: "*", allow: "/", disallow: [...ROBOTS_DISALLOW] });
    expect(robots.sitemap).toBe(`${SITE}/sitemap.xml`);
    expect(ROBOTS_DISALLOW).toEqual(
      expect.arrayContaining(["/admin", "/account", "/reseller-portal", "/cart", "/checkout", "/api", "/auth", "/masuk", "/daftar", "/design-system"]),
    );
  });

  it("blocks everything anywhere else (preview, development)", () => {
    expect(buildRobots(false, SITE)).toEqual({ rules: { userAgent: "*", disallow: "/" } });
  });
});

describe("buildSitemap", () => {
  const base = { siteUrl: SITE, products: [], categories: [], hasTestimonials: false, hasFaqs: false };
  const urls = (input: Parameters<typeof buildSitemap>[0]) => buildSitemap(input).map((entry) => entry.url);

  it("always lists the fixed public pages, never private ones", () => {
    const list = urls(base);
    for (const path of ["/", "/produk", "/tentang-kami", "/manfaat", "/beauty-concierge", "/skin-quiz", "/reseller", "/kontak", "/kebijakan-privasi"]) {
      expect(list).toContain(new URL(path, SITE).toString());
    }
    expect(list.some((url) => /account|checkout|cart|admin|artikel|paket/.test(url))).toBe(false);
  });

  it("lists /testimoni and /faq only when they have content", () => {
    expect(urls(base)).not.toContain(`${SITE}/testimoni`);
    expect(urls(base)).not.toContain(`${SITE}/faq`);
    const full = urls({ ...base, hasTestimonials: true, hasFaqs: true });
    expect(full).toContain(`${SITE}/testimoni`);
    expect(full).toContain(`${SITE}/faq`);
  });

  it("adds categories and products with their last change and image", () => {
    const sitemap = buildSitemap({
      ...base,
      categories: [{ slug: "serum" }],
      products: [{ slug: "licorice-serum", updatedAt: "2026-09-20T10:00:00Z", image: `${SITE}/img.webp` }],
    });
    expect(sitemap).toContainEqual(expect.objectContaining({ url: `${SITE}/produk/kategori/serum` }));
    expect(sitemap).toContainEqual({
      url: `${SITE}/produk/licorice-serum`,
      lastModified: new Date("2026-09-20T10:00:00Z"),
      changeFrequency: "weekly",
      priority: 0.8,
      images: [`${SITE}/img.webp`],
    });
  });

  it("still serves the fixed pages when the catalog can't be read", () => {
    const list = urls({ ...base, products: null, categories: null });
    expect(list).toContain(`${SITE}/produk`);
    expect(list.some((url) => url.includes("/produk/"))).toBe(false);
  });
});

describe("structured data", () => {
  it("builds absolute URLs from the site URL", () => {
    expect(absoluteUrl("/faq")).toBe(`${SITE}/faq`);
    expect(absoluteUrl("/faq", "https://preview.example")).toBe("https://preview.example/faq");
  });

  it("breadcrumbs have 1-based positions and absolute URLs", () => {
    expect(breadcrumbJsonLd([{ name: "Beranda", path: "/" }, { name: "FAQ", path: "/faq" }])).toEqual({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Beranda", item: `${SITE}/` },
        { "@type": "ListItem", position: 2, name: "FAQ", item: `${SITE}/faq` },
      ],
    });
  });

  it("organization includes only configured contact fields and only verified profiles", () => {
    const bare = organizationJsonLd(null, []);
    expect(bare).toMatchObject({ "@type": "Organization", name: "CNS Beauty", url: `${SITE}/`, logo: `${SITE}/brand/cns-logo-mark.png` });
    expect(bare).not.toHaveProperty("sameAs");
    expect(bare).not.toHaveProperty("contactPoint");

    const full = organizationJsonLd({ whatsapp: "6281234567890", email: "halo@cnsbeauty.id", instagram: "someone" }, ["https://instagram.com/cnsbeauty"]);
    expect(full.sameAs).toEqual(["https://instagram.com/cnsbeauty"]);
    expect(full.contactPoint).toEqual({
      "@type": "ContactPoint",
      contactType: "customer service",
      availableLanguage: "id",
      telephone: "+6281234567890",
      email: "halo@cnsbeauty.id",
    });
    // The contact Instagram handle is never promoted to an official profile.
    expect(JSON.stringify(full)).not.toContain("someone");
  });

  it("website search points at the catalog search", () => {
    expect(websiteJsonLd()).toEqual({
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "CNS Beauty",
      url: `${SITE}/`,
      potentialAction: { "@type": "SearchAction", target: `${SITE}/produk?q={search_term_string}`, "query-input": "required name=search_term_string" },
    });
  });

  it("FAQPage mirrors exactly the rendered questions, and is absent without any", () => {
    expect(faqPageJsonLd([])).toBeNull();
    expect(faqPageJsonLd([{ question: "Berapa lama pengiriman?", answer: "2-4 hari kerja." }])).toEqual({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [{ "@type": "Question", name: "Berapa lama pengiriman?", acceptedAnswer: { "@type": "Answer", text: "2-4 hari kerja." } }],
    });
  });

  it("products without reviews carry no rating", () => {
    const product = {
      slug: "serum",
      name: "Serum",
      sku: "CNS-SR",
      shortDescription: undefined,
      images: [],
      price: { amount: 150000 },
      availability: "in_stock",
      rating: undefined,
      category: null,
    } as unknown as ProductDetail;
    const data = productJsonLd(product);
    expect(data).not.toHaveProperty("aggregateRating");
    expect(data).toMatchObject({ "@type": "Product", offers: { priceCurrency: "IDR", price: 150000, availability: "https://schema.org/InStock" } });
    expect(productJsonLd({ ...product, rating: { average: 4.5, count: 2 } } as ProductDetail)).toHaveProperty("aggregateRating", {
      "@type": "AggregateRating",
      ratingValue: 4.5,
      reviewCount: 2,
    });
  });
});
