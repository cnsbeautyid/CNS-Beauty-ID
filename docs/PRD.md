# CNS Beauty Skincare --- Product Requirements Document (PRD)

## Website & AI-Native Beauty Commerce Platform

**Version:** 1.0\
**Status:** Development Baseline\
**Product:** CNS Beauty Skincare by Wina Ranesa\
**Platform:** Next.js + TypeScript + App Router\
**Backend:** Supabase\
**Hosting:** Vercel

------------------------------------------------------------------------

# 1. Executive Summary

CNS Beauty Website adalah digital experience untuk brand CNS Beauty
Skincare yang menggabungkan tiga experience utama:

1.  **Brand Experience** --- membangun awareness, storytelling, edukasi
    dan emotional connection.
2.  **AI Beauty Experience** --- membantu pelanggan memahami kebutuhan
    kulit, menemukan produk dan membangun beauty routine.
3.  **Commerce Experience** --- product discovery, cart, checkout,
    order, loyalty dan repeat purchase.

PRD ini menggunakan dua basis utama:

-   Arah visual dari ilustrasi website CNS Beauty yang telah dibuat:
    premium beauty, blush/peach/cream, rose-gold/gold accents, editorial
    photography, floral/pearl/water elements, rounded product panels,
    dan clean luxury layout.
-   Frontend/UI Technical Specification CNS Beauty v1.0, yang menetapkan
    Next.js + TypeScript + App Router, Vercel, Supabase, serta konsep
    **AI Beauty Concierge as the Front Door**.

Target akhir bukan sekadar website katalog/e-commerce, tetapi
**AI-native beauty commerce platform** yang menghubungkan brand,
konsultasi kecantikan, commerce, customer data, loyalty dan reseller
ecosystem.

------------------------------------------------------------------------

# 2. Product Vision

### Vision

> **CNS Beauty menjadi digital beauty companion yang membantu setiap
> perempuan menemukan ritual perawatan kulit yang sesuai, berbelanja
> dengan mudah, dan membangun kebiasaan mencintai diri sendiri.**

### Brand Philosophy

CNS Beauty hadir sebagai bagian dari ritual kecil untuk merawat dan
mencintai diri sendiri setiap hari.

Pesan founder:

> "Cantik bukan hanya tentang bagaimana orang lain melihat kita. Cantik
> adalah tentang bagaimana kita melihat dan menghargai diri kita
> sendiri."

Website harus menerjemahkan filosofi tersebut ke dalam pengalaman
digital, bukan hanya menampilkannya sebagai copy.

------------------------------------------------------------------------

# 3. Product Objectives

## 3.1 Business Objectives

-   Membangun official digital storefront CNS Beauty.
-   Meningkatkan product discovery.
-   Meningkatkan conversion rate.
-   Membangun customer database first-party.
-   Meningkatkan repeat purchase.
-   Membangun loyalty ecosystem.
-   Menjadi channel edukasi dan brand storytelling.
-   Menjadi foundation untuk AI Beauty Concierge.
-   Menjadi foundation untuk reseller ecosystem.

## 3.2 Customer Objectives

Customer dapat:

-   memahami brand CNS Beauty;
-   menemukan produk berdasarkan kebutuhan;
-   melihat manfaat, ingredients dan cara penggunaan;
-   mendapatkan rekomendasi personal;
-   berkonsultasi dengan AI Beauty Concierge;
-   melakukan pembelian;
-   memantau order;
-   mengumpulkan loyalty points;
-   menyimpan skin profile;
-   mendapatkan personalized routine.

## 3.3 AI Objectives

AI harus dapat:

-   memahami intent customer;
-   memahami konteks halaman;
-   memberikan rekomendasi berbasis knowledge;
-   membantu skin consultation;
-   menjawab pertanyaan produk;
-   membangun routine;
-   membantu customer service;
-   mendukung reseller;
-   menjadi interaction layer lintas halaman.

------------------------------------------------------------------------

# 4. Target Users

## Persona A --- Beauty Consumer

Perempuan yang ingin merawat kulit secara rutin dan mencari produk yang
mudah dipahami.

Needs: - produk yang sesuai kebutuhan; - informasi sederhana; -
rekomendasi; - pengalaman visual premium; - checkout mudah.

## Persona B --- Existing Customer

Customer yang sudah pernah membeli.

Needs: - reorder; - order tracking; - loyalty; - personalized routine; -
product recommendation.

## Persona C --- Beauty Explorer

Customer yang belum mengenal produk CNS Beauty.

Needs: - edukasi; - product discovery; - quiz; - AI consultation; -
social proof.

## Persona D --- Reseller

Partner penjualan CNS Beauty.

Needs: - katalog; - sales tools; - customer consultation; - AI sales
assistant; - commission; - marketing assets.

## Persona E --- CNS Admin

Internal CNS Beauty.

Needs: - product management; - order management; - inventory; - customer
management; - content; - AI knowledge; - analytics.

------------------------------------------------------------------------

# 5. Information Architecture

``` text
/
├── Home
├── Produk
│   ├── Semua Produk
│   ├── Serum
│   ├── Moisturizer
│   ├── Face Mist
│   ├── Body Care
│   └── Paket / Glow Routine
├── Produk/[slug]
├── Tentang Kami
├── Manfaat
├── Testimoni
├── Artikel
│   └── [slug]
├── Beauty Concierge
├── Skin Quiz
├── Paket / Bundle
├── FAQ
├── Reseller
├── Cart
├── Checkout
├── Account
│   ├── Dashboard
│   ├── Orders
│   ├── Wishlist
│   ├── Loyalty
│   ├── Skin Profile
│   ├── Routine
│   └── Settings
├── Reseller Portal
└── Admin
```

Frontend specification juga menetapkan Shop, Product Detail, Beauty
Concierge, Skin Quiz, Bundle, Journal, FAQ, Reseller, Cart, Checkout,
Account, Reseller Portal dan Admin sebagai bagian dari information
architecture.

------------------------------------------------------------------------

# 6. Visual Design Direction

## 6.1 Design Concept

### "Premium Feminine Beauty Editorial"

Karakter:

-   elegant;
-   feminine;
-   warm;
-   sophisticated;
-   clean;
-   premium;
-   emotionally engaging;
-   trustworthy;
-   modern.

## 6.2 Visual Palette

Primary: - Deep Cocoa / Brown - Warm Cream - Blush Pink - Soft Peach -
Rose Gold

Supporting: - Champagne Gold - Soft Beige - Botanical Green sebagai
accent terbatas.

## 6.3 Typography

Display:

`Cormorant Garamond`

Body:

`Inter`

Visual hierarchy: - large editorial headline; - short supporting copy; -
strong CTA; - generous whitespace.

Technical specification menetapkan Cormorant Garamond sebagai display
font dan Inter sebagai body font.

## 6.4 Design Principles

1.  Image-first.
2.  Whitespace.
3.  Editorial typography.
4.  Restrained shadows.
5.  Premium product photography.
6.  Consistent product card.
7.  Strong but elegant CTA.
8.  Mobile-first responsive behavior.
9.  AI interaction selalu accessible.

------------------------------------------------------------------------

# 7. Global Header

Desktop:

``` text
CNS BEAUTY

Beranda
Produk
Tentang Kami
Manfaat
Testimoni
Artikel
Kontak

Search   Account   Cart
```

Mobile:

``` text
☰   CNS BEAUTY                     🛒
```

Header harus sticky pada desktop/mobile dengan perubahan visual saat
scroll.

------------------------------------------------------------------------

# 8. Homepage

## Objective

Membangun brand emotion → product discovery → AI engagement → purchase.

## Hero

Headline:

> **Kulit Sehat, Lebih Percaya Diri**

Alternative campaign headline:

> **Ritual Cantik Untuk Diri Sendiri**

Supporting copy:

> Perawatan kulit berkualitas untuk membantu kulit terasa lebih bersih,
> halus, lembut, cerah dan wangi.

CTA:

-   `Jelajahi Produk`
-   `Tanya Beauty AI`

Visual:

-   model CNS Beauty;
-   hero product lineup;
-   floral elements;
-   soft water/reflection;
-   peach/blush background;
-   rose-gold accents.

## USP Strip

``` text
Kandungan Aman & Berkualitas
Teruji Secara Dermatologis*
Cocok untuk Berbagai Jenis Kulit*
Dipercaya Pelanggan*
```

(\*) Semua claim harus diverifikasi sebelum dipublikasikan.

## Shop by Concern

Contoh:

-   Kulit Kusam
-   Kulit Kering
-   Kulit Sensitif
-   Dark Spot
-   Butuh Kelembapan
-   Glow Routine

## Featured Products

Product cards:

-   Serum DNA Salmon
-   Licore Moisturizer Skin Glow
-   Brightening Face Mist
-   Glow Routine

Nama/benefit final harus mengikuti master product catalog CNS Beauty.

## AI Beauty Experience

Headline:

> "Ceritakan kebutuhan kulitmu. Biarkan AI membantu menemukan ritualmu."

CTA:

`Mulai Konsultasi`

## Founder Story Preview

Quote:

> "Cantik adalah tentang bagaimana kita melihat dan menghargai diri kita
> sendiri."

CTA:

`Kenali CNS Beauty`

------------------------------------------------------------------------

# 9. Product Page

Ilustrasi referensi menunjukkan halaman produk dengan:

-   hero product showcase;
-   model;
-   product lineup;
-   product category navigation;
-   product cards;
-   benefit icons;
-   CTA "Lihat Produk".

## Product Categories

Minimum:

-   Semua Produk
-   Serum
-   Moisturizer
-   Face Mist
-   Body Care
-   Paket / Glow Routine

## Product Card

``` text
[Product Image]

CNS BEAUTY
Product Name

Short benefit

Benefit icons

Price

[Lihat Produk]
```

Desktop hover:

-   image zoom;
-   quick view;
-   AI recommendation CTA.

Mobile tidak boleh bergantung pada hover.

------------------------------------------------------------------------

# 10. Initial Product Catalog

Berdasarkan visual reference yang diberikan:

### 1. CNS Beauty Serum DNA Salmon

Positioning: - serum / intensive skincare.

Visual: - dark bottle; - gold cap; - dropper.

### 2. Licore Moisturizer Skin Glow

Positioning: - moisturizer.

Visual: - white/cream jar; - gold lid; - premium packaging.

### 3. Brightening Face Mist

Positioning: - face mist.

Visual: - dark packaging; - pump/spray; - gold details.

### 4. Glow Routine

Bundle / routine package.

Visual: - serum; - moisturizer; - face mist; - coordinated product
composition.

### Product Data Requirement

Setiap produk minimal memiliki:

``` text
id
slug
name
category
short_description
description
benefits[]
ingredients[]
how_to_use
skin_types[]
concerns[]
price
compare_at_price
stock
images[]
badges[]
rating
review_count
status
```

------------------------------------------------------------------------

# 11. Product Detail Page

Layout desktop:

``` text
Product Gallery        Product Information
                       Product Name
                       Rating
                       Description
                       Benefits
                       Price
                       Quantity
                       Add to Cart
                       Ask Beauty AI
```

Sections:

1.  Product gallery.
2.  Product information.
3.  Benefits.
4.  Ingredients.
5.  How to use.
6.  Suitable skin types.
7.  Reviews.
8.  FAQ.
9.  Related products.
10. AI Product Assistant.

CTA:

`Tambah ke Keranjang`

Secondary:

`Tanya Beauty AI`

------------------------------------------------------------------------

# 12. About Us Page

## Hero

Headline:

> **CNS Beauty Skincare**

Subheadline:

> **Ritual Cantik untuk Diri Sendiri**

Founder:

**Wina Ranesa --- Founder & Owner CNS Beauty**

## Brand Story

Gunakan pesan founder sebagai source copy utama.

Core message:

-   self-care;
-   self-worth;
-   confidence;
-   feeling beautiful;
-   daily ritual;
-   connection with loved ones;
-   skin that feels clean, smooth, soft, bright and fragrant.

## Visual

-   founder/model image;
-   CNS product lineup;
-   elegant floral environment;
-   founder quote;
-   signature treatment.

## Brand Values

``` text
Kualitas
Perawatan
Kepercayaan Diri
Self-Love
```

------------------------------------------------------------------------

# 13. Benefits Page

Purpose:

Menghubungkan kebutuhan customer dengan product benefit.

Visual structure:

``` text
Concern
   ↓
Desired Result
   ↓
Recommended Product
   ↓
Routine
```

Example:

``` text
Kulit Kusam
↓
Kulit Tampak Lebih Cerah
↓
Serum
↓
Glow Routine
```

Important: - Jangan membuat medical/dermatological claims tanpa source
yang valid. - Claims harus berasal dari product master data yang telah
disetujui.

------------------------------------------------------------------------

# 14. Testimonial Page

Components:

-   testimonial cards;
-   customer photo;
-   rating;
-   product;
-   verified purchase badge;
-   before/after only when legally and factually approved.

Filters:

-   Product;
-   Skin concern;
-   Skin type.

------------------------------------------------------------------------

# 15. Journal / Artikel

Content categories:

-   Skincare Education
-   Beauty Routine
-   Ingredients
-   Self Care
-   CNS Beauty Story
-   Product Guide

SEO requirements:

-   title;
-   slug;
-   description;
-   cover;
-   author;
-   publish date;
-   tags;
-   canonical;
-   Open Graph.

------------------------------------------------------------------------

# 16. Beauty Concierge

AI Beauty Concierge adalah persistent interaction layer.

Technical specification menetapkan bahwa AI harus mudah diakses dari
seluruh halaman.

Desktop:

``` text
┌─────────────────────────────┐
│ ✨ CNS Beauty AI            │
│                             │
│ “Apa yang kamu butuhkan?”   │
│                             │
│ [Chat...]                   │
│                             │
│ Product Recommendations     │
└─────────────────────────────┘
```

Mobile:

Floating button:

``` text
✨
```

Tap → bottom sheet/full-screen conversation.

Quick prompts:

-   `Cari skincare`
-   `Kulit saya kusam`
-   `Kulit saya sensitif`
-   `Buat routine`
-   `Produk untuk saya`

------------------------------------------------------------------------

# 17. AI Capabilities

## P0

-   Product Q&A.
-   Product recommendation.
-   Skin concern discovery.
-   Product comparison.
-   Routine recommendation.
-   FAQ.
-   Order assistance.

## P1

-   Skin Quiz interpretation.
-   Personalized routine.
-   Reorder recommendation.
-   Loyalty assistance.

## P2

-   Voice AI.
-   Agentic commerce.
-   Predictive reorder.
-   Reseller AI Copilot.

------------------------------------------------------------------------

# 18. AI Context Contract

AI menerima contextual page metadata:

``` ts
type PageContext = {
  pageType:
    | "home"
    | "shop"
    | "product"
    | "cart"
    | "checkout"
    | "account"
    | "reseller";

  productId?: string;
  categoryId?: string;
  orderId?: string;
  campaignId?: string;
};
```

Contoh:

``` json
{
  "pageType": "product",
  "productId": "uuid",
  "categoryId": "serum"
}
```

Page context membantu AI memahami halaman yang sedang dilihat user,
tetapi tidak boleh digunakan sebagai authorization context.

------------------------------------------------------------------------

# 19. Skin Quiz

Objective:

Mengubah anonymous visitor menjadi personalized customer profile.

Minimum questions:

1.  Skin type.
2.  Main concern.
3.  Sensitivity.
4.  Current routine.
5.  Desired result.
6.  Budget/preference.

State:

``` ts
type SkinQuizState = {
  step: number;
  skinType?: string;
  concerns: string[];
  sensitivity?: string;
  currentRoutine?: string[];
  budget?: number;
  completed: boolean;
};
```

Output:

``` text
Your Skin Profile
↓
Recommended Products
↓
Recommended Routine
↓
Add Routine to Cart
```

------------------------------------------------------------------------

# 20. Cart

Cart must support:

-   product;
-   quantity;
-   price;
-   voucher;
-   shipping;
-   discount;
-   total.

Important:

> Total harga harus berasal dari backend quote. Frontend hanya
> presentation.

------------------------------------------------------------------------

# 21. Checkout

Linear checkout:

``` text
1. Address
2. Shipping
3. Voucher
4. Payment
5. Confirmation
```

State:

``` text
IDLE
↓
LOADING_QUOTE
↓
QUOTE_READY
↓
PAYMENT_INITIATED
↓
PAYMENT_PENDING
↓
PAYMENT_CONFIRMED
↓
ORDER_CREATED
```

Failure states:

-   PAYMENT_FAILED
-   PAYMENT_EXPIRED
-   CHECKOUT_CONFLICT
-   INVENTORY_UNAVAILABLE

------------------------------------------------------------------------

# 22. Account

Dashboard:

-   recent order;
-   loyalty points;
-   skin profile;
-   routine;
-   AI recommendation;
-   wishlist.

Navigation:

``` text
Dashboard
Orders
Wishlist
Loyalty
Skin Profile
Routine
Settings
```

------------------------------------------------------------------------

# 23. Loyalty

CNS Beauty Rewards:

-   points;
-   tier;
-   rewards;
-   transaction history;
-   voucher.

Future:

-   birthday reward;
-   referral;
-   routine completion reward;
-   review reward.

------------------------------------------------------------------------

# 24. Reseller Portal

Reseller dashboard:

``` text
GMV
Orders
Commission
Top Products
Sales Chart
```

Modules:

-   Products;
-   Orders;
-   Customers;
-   Commission;
-   Marketing;
-   AI Assistant.

AI Reseller Assistant:

``` text
Rekomendasikan produk
Bantu customer
Buat sales pitch
Cek commission
Cari marketing asset
```

------------------------------------------------------------------------

# 25. Admin

Modules:

``` text
Dashboard
Products
Inventory
Orders
Customers
Resellers
AI
Knowledge
Content
Analytics
Audit Log
```

Admin dashboard KPIs:

-   GMV;
-   orders;
-   conversion;
-   customers;
-   repeat purchase;
-   AI engagement;
-   AI-assisted GMV;
-   reseller sales.

------------------------------------------------------------------------

# 26. Backend Architecture

``` text
Browser
   ↓
Next.js
   ↓
CNS API / Server Actions
   ↓
Business Services
   ├── Product
   ├── Cart
   ├── Checkout
   ├── Order
   ├── Loyalty
   ├── Reseller
   └── AI
        ↓
     Supabase
```

Frontend must never expose:

-   Supabase service role key;
-   LLM secrets;
-   payment secrets;
-   webhook secrets;
-   admin secrets.

------------------------------------------------------------------------

# 27. Technology Stack

## Frontend

-   Next.js
-   TypeScript
-   App Router
-   React
-   Tailwind CSS
-   shadcn/ui or equivalent internal UI primitives

## State

-   TanStack Query --- server state
-   Zustand --- UI state
-   React Hook Form
-   Zod

## Backend

-   Supabase
-   PostgreSQL
-   Supabase Auth
-   Supabase Storage
-   Row Level Security

## Hosting

-   Vercel

## AI

AI provider should be abstracted through an AI Gateway/Service layer.

Architecture:

``` text
CNS Frontend
      ↓
AI API
      ↓
Agent Orchestrator
      ↓
RAG / Knowledge
      ↓
LLM
      ↓
Product / Order / Customer Tools
```

------------------------------------------------------------------------

# 28. Database Core Entities

Minimum entities:

``` text
profiles
products
product_categories
product_images
product_benefits
product_ingredients
inventory
carts
cart_items
orders
order_items
payments
shipping_addresses
wishlists
reviews
loyalty_accounts
loyalty_transactions
skin_profiles
skin_quiz_sessions
routines
routine_items
ai_conversations
ai_messages
ai_recommendations
knowledge_documents
resellers
reseller_customers
reseller_orders
reseller_commissions
content_articles
campaigns
analytics_events
audit_logs
```

------------------------------------------------------------------------

# 29. Security & Authorization

RBAC minimum:

``` text
customer
reseller
admin
super_admin
content_editor
customer_service
```

Rules:

-   RLS enabled.
-   Server-side authorization.
-   Least privilege.
-   No sensitive secrets in browser.
-   Audit admin actions.
-   Minimize PII in analytics.
-   AI cannot bypass authorization.

------------------------------------------------------------------------

# 30. Analytics

Critical events:

``` text
PAGE_VIEWED
PRODUCT_VIEWED
PRODUCT_SEARCHED
AI_OPENED
AI_MESSAGE_SENT
AI_RECOMMENDATION_VIEWED
AI_RECOMMENDATION_ACCEPTED
SKIN_QUIZ_STARTED
SKIN_QUIZ_COMPLETED
ADD_TO_CART
CHECKOUT_STARTED
PAYMENT_STARTED
ORDER_CREATED
ORDER_DELIVERED
REVIEW_CREATED
LOYALTY_VIEWED
VOUCHER_APPLIED
RESELLER_AI_USED
```

Primary funnel:

``` text
Visitor
 ↓
Discovery
 ↓
AI Engagement
 ↓
Recommendation
 ↓
Product View
 ↓
Add to Cart
 ↓
Checkout
 ↓
Payment
 ↓
Order
 ↓
Repeat Purchase
```

AI funnel:

``` text
AI Open
 ↓
Message
 ↓
Intent
 ↓
Recommendation
 ↓
Accepted
 ↓
Product
 ↓
Cart
 ↓
Purchase
```

Primary AI KPI:

**AI-assisted GMV**, bukan hanya jumlah chat.

------------------------------------------------------------------------

# 31. SEO

SEO-first pages:

-   Home;
-   Produk;
-   Product Detail;
-   Artikel;
-   FAQ;
-   Reseller.

Requirements:

-   metadata;
-   Open Graph;
-   Product structured data;
-   Breadcrumb structured data;
-   canonical;
-   sitemap;
-   robots;
-   semantic headings.

AI chat tidak menggantikan SEO content.

------------------------------------------------------------------------

# 32. Performance

Target:

  Metric                  Target
  ------------------- ----------
  Initial page load      \< 2.5s
  LCP                    \< 2.5s
  CLS                     \< 0.1
  INP                   \< 200ms
  Product API p95       \< 500ms
  Cart API p95          \< 500ms
  AI first token           \< 2s

Payment provider latency excluded from checkout API target.

------------------------------------------------------------------------

# 33. Responsive Design

Breakpoints:

``` text
Mobile      < 640px
Tablet      640–1023px
Desktop     1024–1439px
Large       >= 1440px
```

Product grid:

``` text
Mobile      2 columns
Tablet      3 columns
Desktop     4 columns
Large       4–5 columns
```

Product detail mobile:

``` text
Gallery
↓
Product information
↓
Price
↓
Sticky Add to Cart
```

AI mobile:

``` text
Floating Button
↓
Bottom Sheet / Full Screen
```

------------------------------------------------------------------------

# 34. Accessibility

Target:

**WCAG 2.2 AA**

Mandatory:

-   keyboard navigation;
-   focus state;
-   semantic HTML;
-   ARIA labels;
-   accessible modal/drawer;
-   contrast;
-   reduced motion;
-   alt text;
-   screen-reader friendly AI.

Streaming AI response:

``` html
aria-live="polite"
```

------------------------------------------------------------------------

# 35. Image Strategy

Product photography is a key part of CNS Beauty's premium positioning.

Use:

-   Next/Image;
-   responsive sizes;
-   WebP/AVIF;
-   lazy loading;
-   priority only above-the-fold.

Variants:

``` text
thumbnail
card
detail
zoom
social
hero
```

Reference visual direction:

-   high-end beauty editorial;
-   soft natural lighting;
-   blush/peach background;
-   gold/rose-gold packaging accents;
-   botanical/floral props;
-   premium marble/stone surfaces;
-   clean product cutouts where needed.

------------------------------------------------------------------------

# 36. Component Architecture

``` text
components/
├── ui/
├── layout/
├── product/
├── ai/
├── commerce/
├── customer/
├── reseller/
└── admin/
```

Core product components:

``` text
ProductCard
ProductGrid
ProductGallery
ProductPrice
ProductBadge
ProductRating
ProductBenefitList
IngredientList
UsageGuide
RelatedProducts
AIProductAssistant
```

Core AI components:

``` text
AIAvatar
AIChatWindow
AIMessage
AIInput
AIRecommendationCard
AIProductCarousel
AIThinkingIndicator
AIToolStatus
AIConfidenceIndicator
HumanHandoff
VoiceControl
```

------------------------------------------------------------------------

# 37. Design System

Centralized design tokens are mandatory.

``` text
Design Token
↓
UI Primitive
↓
Component
↓
Page
↓
Experience
```

Do not use arbitrary colors/styles inside components.

Core token direction:

``` text
Primary: deep cocoa
Secondary: warm cream
Surface: soft ivory
Accent: blush / rose
Premium accent: champagne gold
AI surface: warm neutral
```

------------------------------------------------------------------------

# 38. Product Claims Governance

The reference images contain claims such as:

-   BPOM Approved;
-   aman untuk semua jenis kulit;
-   hasil nyata & terbukti;
-   aman untuk kulit sensitif;
-   membantu memudarkan dark spot.

These claims must **not automatically become production copy**.

Before publishing:

``` text
Claim
↓
Evidence / regulatory verification
↓
Product master approval
↓
Content approval
↓
Production
```

The CMS should ideally store:

``` text
claim
claim_type
evidence_reference
approval_status
approved_by
approved_at
expiry_date
```

------------------------------------------------------------------------

# 39. MVP Scope

## P0 --- Launch

### Brand

-   Homepage;
-   Tentang Kami;
-   Manfaat;
-   Testimoni;
-   Artikel.

### Commerce

-   Product listing;
-   Product detail;
-   Cart;
-   Checkout;
-   Order;
-   Payment integration abstraction.

### AI

-   Persistent AI entry point;
-   Product Q&A;
-   Product recommendation;
-   Basic skin consultation.

### Customer

-   Auth;
-   Account;
-   Order history.

### Admin

-   Product;
-   Inventory;
-   Order;
-   Customer;
-   Content.

------------------------------------------------------------------------

# 40. P1 Scope

-   Skin Quiz;
-   Personalized routine;
-   Loyalty;
-   Wishlist;
-   Beauty Concierge full page;
-   Journal;
-   Reseller Portal;
-   Reseller AI Assistant;
-   Advanced analytics.

------------------------------------------------------------------------

# 41. P2 Scope

-   Voice AI;
-   AI Avatar;
-   Predictive reorder;
-   Agentic commerce;
-   Personalized campaign;
-   AI reseller copilot;
-   advanced recommendation engine.

------------------------------------------------------------------------

# 42. Critical User Journeys

## Journey 1 --- Discovery → Purchase

``` text
Home
↓
Produk
↓
Product Detail
↓
Add to Cart
↓
Checkout
↓
Payment
↓
Order Confirmation
```

## Journey 2 --- AI → Purchase

``` text
Home
↓
Ask Beauty AI
↓
Skin Consultation
↓
Recommendation
↓
Product
↓
Add to Cart
↓
Checkout
```

## Journey 3 --- Existing Customer

``` text
Login
↓
Dashboard
↓
AI Recommendation
↓
Reorder
↓
Checkout
```

## Journey 4 --- Reseller

``` text
Login
↓
Reseller Dashboard
↓
AI Assistant
↓
Customer Consultation
↓
Product Recommendation
↓
Sales
↓
Commission
```

------------------------------------------------------------------------

# 43. Definition of Done

A page is complete when:

### Functional

-   responsive;
-   API integrated;
-   loading;
-   empty;
-   error;
-   auth;
-   authorization.

### UI

-   design tokens;
-   typography;
-   spacing;
-   responsive behavior;
-   accessibility.

### AI-enabled pages

-   contextual AI;
-   streaming;
-   recommendation cards;
-   tool status;
-   fallback;
-   human handoff.

### Engineering

-   TypeScript strict;
-   Zod validation;
-   no secrets client-side;
-   analytics events;
-   unit tests;
-   integration tests;
-   E2E tests.

------------------------------------------------------------------------

# 44. Recommended Development Sequence

## Sprint 0 --- Foundation

-   repository;
-   Next.js;
-   Tailwind;
-   Supabase;
-   Auth;
-   design tokens;
-   UI primitives;
-   CI/CD;
-   Vercel.

## Sprint 1 --- Brand Experience

-   Header;
-   Footer;
-   Homepage;
-   About;
-   Benefits;
-   Testimonials;
-   Articles.

## Sprint 2 --- Product Commerce

-   Product schema;
-   Product listing;
-   Product detail;
-   Search;
-   Filter;
-   Cart.

## Sprint 3 --- Checkout

-   Address;
-   Shipping;
-   Voucher;
-   Payment;
-   Order;
-   confirmation.

## Sprint 4 --- AI

-   AI gateway;
-   knowledge base;
-   RAG;
-   AI chat;
-   product recommendation;
-   page context.

## Sprint 5 --- Personalization

-   Skin Quiz;
-   Skin Profile;
-   Routine;
-   Recommendation.

## Sprint 6 --- Loyalty & Reseller

-   Loyalty;
-   Reseller;
-   commission;
-   reseller AI.

## Sprint 7 --- Optimization

-   Analytics;
-   SEO;
-   performance;
-   accessibility;
-   E2E;
-   conversion optimization.

------------------------------------------------------------------------

# 45. Success Metrics

## Commerce

-   Conversion Rate;
-   Add-to-Cart Rate;
-   Checkout Completion Rate;
-   Average Order Value;
-   Repeat Purchase Rate;
-   Revenue;
-   GMV.

## Product Discovery

-   Product View Rate;
-   Search-to-Product View;
-   Product Recommendation CTR.

## AI

-   AI Open Rate;
-   AI Engagement Rate;
-   Recommendation Acceptance Rate;
-   AI-assisted Add-to-Cart;
-   AI-assisted GMV;
-   AI resolution rate.

## Customer

-   Skin Quiz completion;
-   Routine adoption;
-   Loyalty participation;
-   reorder rate.

## Reseller

-   Active Resellers;
-   Reseller GMV;
-   AI-assisted reseller sales;
-   Commission generated.

------------------------------------------------------------------------

# 46. Final Product Blueprint

CNS Beauty Website harus diposisikan sebagai:

``` text
                 CNS BEAUTY
                      │
        ┌─────────────┼─────────────┐
        ↓             ↓             ↓
      BRAND           AI          COMMERCE
        │             │             │
     Story         Consult       Product
     Content       Recommend     Cart
     Education     Personalize   Checkout
        │             │             │
        └─────────────┼─────────────┘
                      ↓
                CUSTOMER DATA
                      ↓
              Loyalty / Routine
                      ↓
                Repeat Purchase
```

### Strategic UX Principle

> **AI Beauty Concierge bukan widget tambahan. AI menjadi interaction
> layer yang menghubungkan brand, beauty consultation, product
> discovery, commerce, customer data, loyalty dan reseller ecosystem.**

------------------------------------------------------------------------

# 47. Visual Acceptance Criteria

Website harus secara visual mendekati karakter reference design yang
telah disepakati:

-   premium feminine;
-   blush/peach/cream dominant;
-   elegant editorial typography;
-   model photography sebagai emotional anchor;
-   product photography sebagai commerce anchor;
-   rose-gold/gold details;
-   botanical/floral accents;
-   clean whitespace;
-   soft rounded panels;
-   high-quality product imagery;
-   CTA yang jelas;
-   tidak terlihat seperti template e-commerce generik.

**Prioritas visual:**

1.  Product photography.
2.  Brand/model photography.
3.  Typography.
4.  Whitespace.
5.  Color consistency.
6.  CTA hierarchy.
7.  AI interaction.

------------------------------------------------------------------------

# 48. Source of Truth

Untuk implementasi, gunakan urutan prioritas:

1.  **Approved CNS Beauty brand/product assets**
2.  **Approved product master & claims**
3.  **Founder-approved brand story**
4.  **This PRD**
5.  **Frontend/UI Technical Specification**
6.  **Reference illustrations**

Jika terdapat konflik antara visual reference dan approved product data,
**approved product data menjadi source of truth**.
