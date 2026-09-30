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
- [x] Basic AI (Phase 9 — streaming concierge via nara/agnes OpenAI-compatible gateway, controlled tools, logging, handoff; needs LLM_BASE_URL/LLM_API_KEY)
- [x] Account (Phase 8 — dashboard, orders + reorder, wishlist, profile & addresses, DB cart after login)
- [ ] Admin catalog/order

## P1
- [ ] Skin Quiz
- [ ] Skin Profile
- [ ] Routine
- [ ] Loyalty
- [ ] Beauty Concierge
- [ ] Journal
- [ ] Reseller Portal
- [ ] Reseller AI
- [ ] Advanced analytics

## P2
- [ ] Voice AI
- [ ] AI Avatar
- [ ] Predictive reorder
- [ ] AI Reseller Copilot
- [ ] Agentic Commerce
