# Implementation Checklist

## P0
- [x] Repository foundation (Phase 0 — see docs/ARCHITECTURE.md)
- [x] Supabase project/config (live project CNS-Beauty-Skincare, ADR-001; migrations not yet fetched into repo)
- [x] Auth (Phase 7 — basic email/password sign-in, sign-up, callback, sign-out)
- [x] Design system (Phase 1 — preview at /design-system)
- [x] Header/footer (Phase 1)
- [x] Homepage (Phase 2 — data sections pending catalog, reviews, journal)
- [x] Product catalog (Phase 4 — /produk, /produk/kategori/[slug])
- [x] Product detail (Phase 5 — /produk/[slug]; claim copy gated)
- [x] Cart (Phase 6 — guest cookie cart, backend quote_cart totals; DB cart after login in Phase 8)
- [x] Checkout (Phase 7 — login required, manual bank transfer, proof upload, expiry cron)
- [x] Order (Phase 7 — order detail page; order list in Phase 8)
- [x] RAG knowledge (Phase 10 — approved-only lexical retrieval, reviewer-guarded approvals, auto-chunking; embeddings later)
- [x] Basic AI (Phase 9 — streaming concierge via nara/agnes OpenAI-compatible gateway, controlled tools, logging, handoff; needs LLM_BASE_URL/LLM_API_KEY)
- [x] Account (Phase 8 — dashboard, orders + reorder, wishlist, profile & addresses, DB cart after login)
- [x] Admin catalog/order (Phase 15 — dashboard KPIs, orders, products + claim approval, inventory, customers, resellers, knowledge, audit log)

## P1
- [x] Skin Quiz (Phase 11 — /skin-quiz, rule-based quiz-v1 scoring, routine, add routine to cart)
- [x] Skin Profile (Phase 11 — beauty_profiles upsert, /account/skin-profile)
- [x] Routine (Phase 12 — /account/routine builder, quiz → routine, routine to cart, AI profile/routine tool)
- [x] Loyalty (Phase 13 — CNS Rewards page, reward redemption, points at checkout, loyalty AI tool)
- [x] Beauty Concierge (Phase 17: full page /beauty-concierge, conversation shared with the panel and kept per tab, personal rail)
- [ ] Journal
- [x] Reseller Portal (Phase 14 — programme page + application, partner portal: dashboard, price list, orders)
- [x] Reseller AI (Phase 14 — partner mode with partner price/sales tools, no commission)
- [x] Advanced analytics (Phase 16: event contract v1, server-only ingestion, funnels, conversion KPI, privacy page)
- [x] Analytics retention (Phase 18: 180-day raw events, anonymous daily totals, admin trend)
- [x] SEO (Phase 19: robots, sitemap, share image, canonicals, JSON-LD, /faq, /kontak)

## P2
- [ ] Voice AI
- [ ] AI Avatar
- [ ] Predictive reorder
- [ ] AI Reseller Copilot
- [ ] Agentic Commerce
