# CNS Beauty Frontend/UI Specification

This document preserves the core frontend specification used by the master PRD.

## Core

- Next.js + TypeScript + App Router
- Vercel hosting
- Supabase backend
- Premium Beauty × AI-Native Commerce
- AI Beauty Concierge as the Front Door

## UX

CNS Beauty is composed of:
- Brand
- Commerce
- AI

AI remains available across the customer-facing experience.

## State

Server state: TanStack Query
Global UI: Zustand
Forms: React Hook Form + Zod
Auth: Supabase Auth
AI: SSE/streaming
Persistence: Supabase

## Responsive

Mobile <640
Tablet 640–1023
Desktop 1024–1439
Large >=1440

Product grid:
2 / 3 / 4 / 4–5

## Frontend Security

Never expose service role keys, LLM secrets, payment secrets, webhook secrets or admin secrets.

## SEO

Home, Shop, Product, Journal, FAQ and Reseller are SEO-first.

## Performance

LCP <2.5s
CLS <0.1
INP <200ms
Product API p95 <500ms
Cart API p95 <500ms
AI first token <2s

## Accessibility

WCAG 2.2 AA.

## Analytics

Use the event contract defined in CLAUDE.md and PRD.

## Critical E2E

Discovery → Purchase
AI → Purchase
Existing Customer
Reseller
