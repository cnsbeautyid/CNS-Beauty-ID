# Phase 19: SEO — Design

- **Date:** 2026-10-01
- **Status:** approved in brainstorming, awaiting spec review
- **Scope source:** master prompt §22 (SEO) and §26 phase list, realigned after Phase 18; CLAUDE.md §12
- **Branch:** `feat/phase-19-seo` (stacked on `feat/phase-18-analytics-retention`)

## 1. Goal

Make the storefront fully crawlable and well described to search engines and social previews, and stop sending crawlers and customers to missing pages:

- `sitemap.xml` and `robots.txt`;
- site-wide Open Graph and Twitter defaults, plus a branded default share image;
- structured data (JSON-LD) where it is missing;
- canonical URLs on every indexable page;
- real `/faq` and `/kontak` pages, whose links in the header and footer currently 404;
- hide the `/artikel` and `/paket` links until those pages exist.

### Owner decisions (2026-10-01)

| Question | Decision |
|---|---|
| Scope | Technical SEO plus `/faq` and `/kontak`. The Journal and bundles are out of scope; their nav links are hidden. |
| Default share image | A branded card generated with Next.js (cream background, logo, tagline in Cormorant Garamond). Product pages keep their product photo. |
| Approach | Next.js file conventions (`app/sitemap.ts`, `app/robots.ts`, `app/opengraph-image.tsx`). No new dependencies. |

### Current state (2026-10-01)

- There is no `sitemap.ts` or `robots.ts`.
- JSON-LD appears only on `/produk/[slug]` (`Product` and `BreadcrumbList`, through `src/components/seo/json-ld.tsx`).
- The root layout sets `metadataBase`, a title template and a description. It has no Open Graph or Twitter defaults.
- There is no canonical on `/`, `/manfaat`, `/tentang-kami` or `/testimoni`.
- Every existing `noindex` rule is intentional and stays:
  - filtered or paginated listings;
  - a missing product or category;
  - `/testimoni` when it has no testimonials;
  - the account, cart, checkout, auth, design-system, reseller-portal and admin pages.
- `ROUTES.faq` (`/faq`), `ROUTES.contact` (`/kontak`), `ROUTES.journal` (`/artikel`) and `ROUTES.bundles` (`/paket`) are linked from the nav and footer, and none of them exists.
- **Database:**
  - `faqs` has 5 rows, all `approved`, with topics `shipping`, `product` (×2), `reseller` and `loyalty`. Public RLS allows reading only `status = 'approved'`.
  - The contact details live in `settings.contact` (public) and are read by `getPublicContact()`.

### Out of scope

- The Journal (`/artikel`, `/artikel/[slug]`, `Article` schema).
- Bundles (`/paket`).
- Per-page OG images beyond the existing product photos.
- `hreflang` (the site is Indonesian only).
- Search Console submission (the owner does this after deploy).

## 2. Crawl infrastructure

### `src/app/robots.ts`

- **Production** (`process.env.VERCEL_ENV === "production"`):
  - `allow: "/"`;
  - `disallow` the private or low-value paths: `/admin`, `/account`, `/reseller-portal`, `/cart`, `/checkout`, `/api`, `/auth`, `/masuk`, `/daftar`, `/design-system`;
  - `sitemap`: `${NEXT_PUBLIC_SITE_URL}/sitemap.xml`.
- **Anywhere else** (preview, development, local production builds): `disallow: "/"` for every user agent.
- The rules come from a pure `buildRobots(isProduction, siteUrl)` in `src/lib/seo/robots.ts`, which is unit-tested.

### `src/app/sitemap.ts`

It sets `revalidate = 3600`, and a pure `buildSitemap(input)` in `src/lib/seo/sitemap.ts` does the work (unit-tested).

**Fixed entries:** `/`, `/produk`, `/tentang-kami`, `/manfaat`, `/beauty-concierge`, `/skin-quiz`, `/reseller`, `/kontak`, `/kebijakan-privasi`.
- `/testimoni` is added only when there is at least one testimonial.
- `/faq` is added only when there is at least one approved FAQ.

**Dynamic entries,** read through the public client:
- every visible category (`productCategoryPath(slug)`);
- every published product (`productPath(slug)`), with `lastModified = updated_at` and `images: [main image URL]` when there is one.

It reuses the existing catalog services wherever one already returns this data. Otherwise it runs one narrow read on `products` and one on `categories`, with the same filters the storefront uses.

**Failures:** any read failure is logged, and the sitemap still returns the fixed entries.

## 3. Metadata and share image

- **Root layout (`src/app/layout.tsx`)** adds:
  - `openGraph: { siteName: "CNS Beauty", locale: "id_ID", type: "website" }`
  - `twitter: { card: "summary_large_image" }`
- **Canonicals** (`alternates.canonical`) are added to `/`, `/manfaat`, `/tentang-kami`, `/testimoni`, `/faq` and `/kontak`.
- **`src/app/opengraph-image.tsx`:**
  - It is 1200×630 PNG (`size`, `contentType`, `alt: "CNS Beauty — Your Skin. Your Ritual. Your Confidence."`), built with `ImageResponse`.
  - Contents: a cream background (`#F5F1EC`), the CNS logo mark read from `public/brand/cns-logo-mark.png`, "CNS Beauty" and the tagline in Cormorant Garamond (`#1F1F1F`), and a thin `#8C7A64` rule.
  - The font file, Cormorant Garamond SemiBold (OFL), is committed at `src/assets/fonts/CormorantGaramond-SemiBold.ttf` and read with `fs` at build time. There is no network fetch at build. The file is Fontsource's static 600 cut (77 kB). The `google/fonts` repository ships only the variable font, which `ImageResponse` doesn't render reliably. The `OFL.txt` from `google/fonts` is committed beside it.
  - It is generated at build time (static).
  - Pages that set their own `openGraph.images` (products) keep theirs.

## 4. Structured data

Pure builders live in `src/lib/seo/structured-data.ts` (unit-tested), and are rendered with the existing `JsonLd` component.

- **`organizationJsonLd(contact)`**, on the home page only:
  - `@type: Organization`, with `name`, `url`, and `logo` (the absolute URL of the logo mark);
  - `sameAs`: only verified brand profiles from `SOCIAL_LINKS` in `src/config/site.ts`, which is empty today. The `settings.contact` Instagram handle (`ranesaaaaaaa`) may be a personal account, so it appears on `/kontak` as contact info but is never declared an official profile;
  - `contactPoint` (`contactType: "customer service"`, `availableLanguage: "id"`, `telephone` from the WhatsApp number as `+62…`, `email`), with only the configured fields.
- **`websiteJsonLd()`**, on the home page only: `@type: WebSite` with a `potentialAction` `SearchAction` that targets `${site}/produk?q={search_term_string}`.
  - **Check first:** the catalog search parameter must actually be `q`. If `parseCatalogQuery` uses a different name, the builder uses that name.
- **`breadcrumbJsonLd(items)`:** the existing product-page breadcrumb logic moves here unchanged, and is reused on category pages (Beranda › Produk › {category}), `/faq` and `/kontak`.
- **`faqPageJsonLd(faqs)`:** `@type: FAQPage` with `mainEntity: Question/acceptedAnswer`, built from exactly the rows the page renders. It is omitted when there are none.
- **Product fix:** `aggregateRating` is emitted only when `rating.count > 0`. All other `Product` fields stay as they are.

## 5. New pages

### `/faq` (`src/app/(storefront)/faq/page.tsx`)

- **Rendering:** a Server Component with `revalidate = 300`.
- **Data:** `getPublicFaqs()` in the new `src/services/content/faqs.ts`. It uses the public client, selects `id, question, answer, topic, sort_order` where `status = 'approved'` (RLS enforces this too), and orders by `topic, sort_order`. It returns `FaqItem[] | null`, where `null` means the read failed.
- **Layout:**
  - `<h1>` "Pertanyaan Umum".
  - Groups in a fixed topic order: `product` "Produk", `shipping` "Pengiriman", `loyalty` "CNS Rewards", `reseller` "Reseller". Any other topic goes under "Lainnya".
  - Each group has an `<h2>` and a list of `<details>`/`<summary>` items. `summary` has a 44px minimum height and a visible focus ring.
  - Answers are rendered as plain text with line breaks kept. No HTML is injected.
- **Below the questions:** "Pertanyaanmu belum terjawab?" ("Question not answered?"), with a Beauty AI button (the existing `AskAIButton`) and a link to `/kontak`.
- **States:**
  - Empty: "Belum ada pertanyaan umum." with the contact link, `robots: { index: false, follow: true }`, and no `FAQPage` JSON-LD.
  - Error (`null`): the existing `ErrorState`, also `noindex`.
- **Metadata:** title "Pertanyaan Umum (FAQ)", a description, the canonical, a `FAQPage` block and a breadcrumb.

### `/kontak` (`src/app/(storefront)/kontak/page.tsx`)

- **Rendering:** a Server Component with `revalidate = 300`, using `getPublicContact()`.
- **Content** (each item only when configured):
  - WhatsApp: a primary button to `https://wa.me/{number}` with `target="_blank"`, `rel="noopener noreferrer"`, sr-only "(membuka WhatsApp)", and the `whatsapp_display` text;
  - Instagram: a link to `https://instagram.com/{handle}`;
  - email: `mailto:`;
  - city and region, as text.
- **Also on the page:** a Beauty AI entry and a link to `/faq`.
- **Not configured, or read failed:** "Kontak belum tersedia." with the Beauty AI entry.
- **Metadata:** title "Kontak", a description, the canonical, and a breadcrumb.

### Nav

- Remove the `ROUTES.journal` and `ROUTES.bundles` entries from the header, footer and mobile nav config in `src/config/site.ts`. The `ROUTES` constants stay.
- The Artikel item in the header's top-level list is removed too.

## 6. Testing and validation

### Unit tests (Vitest)

- **`tests/unit/seo.test.ts`:**
  - `buildRobots`: production vs preview, the disallow list, and the sitemap URL;
  - `buildSitemap`: the fixed entries, products with `lastModified` and images, categories, the `/testimoni` and `/faq` conditions, and the fallback when the database is unavailable;
  - `organizationJsonLd`: contact fields omitted when unconfigured, and the `+62` phone format;
  - `websiteJsonLd`: the search target;
  - `breadcrumbJsonLd`: positions and absolute URLs;
  - `faqPageJsonLd`: matches its input, empty input gives `null`;
  - the product `aggregateRating` omission.
- **`tests/unit/faqs.test.ts`** or the integration style used in `tests/integration`, for `getPublicFaqs`: ordering, grouping and the error path.

### E2E (Playwright)

- `/robots.txt` and `/sitemap.xml` return 200. The sitemap lists `/faq` and at least one `/produk/` URL.
  - On the local production server (`VERCEL_ENV` unset), robots disallows everything. The test asserts that behaviour.
- `/faq`:
  - it shows the approved questions;
  - a question expands from the keyboard (Tab to the summary, then Enter);
  - it has `FAQPage` JSON-LD;
  - it passes an axe check.
- `/kontak`: the configured contact links render with correct `href`s, and it passes an axe check.
- `/opengraph-image` returns `image/png`.
- The home `<head>` contains the canonical, `og:site_name`, `og:image` and `twitter:card`.
- The header and footer contain no link to `/artikel` or `/paket`.

### Validation

`npm run validate` and the full Playwright suite. Start the server with `ENABLE_DESIGN_PREVIEW=true`, matching Playwright's `webServer` env. Take screenshots of `/faq`, `/kontak` and the share image. Update `docs/ARCHITECTURE.md` (the Phase 19 summary, the validation row, and the next phase = 20 Performance) and the checklist.

## 7. Risks

- **Robots on the real site.** Production detection relies on `VERCEL_ENV`. If the site is ever hosted outside Vercel, robots would block everything. Mitigation: that condition is documented in `robots.ts`, and the sitemap still works.
- **FAQ content accuracy.** Answers are shown verbatim from approved rows, with no generated text. Claim governance for FAQ answers is the existing `content_status` workflow.
- **Share-image font.** Committing the TTF adds about 200 kB to the repo. It is only read at build time.
