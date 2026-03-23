# PROJECT STATE — Uygunayakkabi

_Last consolidated: 2026-03-23 (Steps 1–20 complete)_

## Project Overview

**Uygunayakkabi** is a Telegram-first, AI-assisted, multi-channel commerce engine built on Next.js + Payload CMS. Products are ingested via Telegram, processed through an AI agent layer (OpenClaw/Mentix), orchestrated by n8n, and published to multiple channels (website, Instagram, Facebook, Shopier, with Dolap/X/LinkedIn/Threads scaffolded).

- **Domain**: uygunayakkabi.com
- **Owner**: Furkan (frk.bas34@gmail.com)
- **Repo**: https://github.com/frkbas34/uygunayakkabi-store
- **Bot**: @mentix_aibot (Telegram)

## Current Status

| Phase | Status | Completed |
|-------|--------|-----------|
| Phase 1 — Core Admin + Storefront | ✅ COMPLETE | 2026-03-13 |
| Phase 2A — Controlled Product Intake (Steps 1–12) | ✅ COMPLETE | 2026-03-16 |
| Phase 2A — Channel Scaffolding (Steps 13–19) | ✅ COMPLETE | 2026-03-22 |
| Phase 2A — Shopier Sync (Step 20) | ✅ COMPLETE | 2026-03-23 |
| Phase 2B — Multi-Channel Distribution | 🟡 PARTIALLY LIVE | — |
| Phase 2C — Content Growth Layer | 📋 PLANNED | — |
| Phase 3 — Visual & Experience | 📋 PLANNED | — |

## Live Systems

### Verified Working Pipelines
- **Telegram → OpenClaw → n8n → Payload draft product** — full E2E pipeline, idempotency active
- **Instagram direct publish** — Graph API v21.0, bypasses n8n (D-088). Verified: post ID 18115629052647099
- **Facebook Page direct publish** — Graph API, Page Access Token exchange (D-089). Verified: facebookPostId 122093848160884171
- **Shopier sync** — Payload jobs queue → Shopier REST API. Verified: Product 11 → Shopier ID 45456186
- **Shopier webhooks** — 4 events registered, HMAC signature verification active
- **Mentix Intelligence Layer v2** — 13 skills deployed on VPS, ops group live

### Production Infrastructure
- **Vercel**: uygunayakkabi.com (storefront + admin + API)
- **VPS (Netcup)**: Docker + Caddy + n8n + OpenClaw
- **Database**: Neon PostgreSQL
- **Media**: Vercel Blob Storage (production)
- **DNS**: Cloudflare → Vercel (main domain) + VPS (flow.*, agent.*)

### Registered Collections (11)
Users, Products, Variants, Brands, Categories, Media, CustomerInquiries, InventoryLogs, Orders, Banners, BlogPosts

### Registered Globals (2)
SiteSettings, AutomationSettings

### Key Credentials (summary — no secrets)
- Instagram Business Account: @uygunayakkabi342026 (user ID: 43139245629)
- Facebook Page: UygunAyakkabı (Graph API page ID: 1040379692491003)
- Instagram token expiry: ~2026-05-20 (refresh via OAuth initiate route)
- Shopier PAT: configured in Vercel
- Telegram authorized users: Furkan (5450039553), Sabri (8049990232), Bahriyar (5232747260)

## Active Priorities

1. **Mentix real ops testing** — product-flow-debugger, sql-toolkit, browser-automation need live testing
2. **Blog frontend routes** — /blog and /blog/[slug] pages not yet implemented
3. **Instagram carousel posts** — multi-image products should use carousel format
4. **Remaining channel integrations** — X, LinkedIn, Threads (scaffolded, not live)
5. **Visual Expansion Engine** — Phase 3 scaffold

## Known Risks

- **push:true** does NOT run in production. New collections/globals need manual Neon SQL verification.
- **Instagram token** expires ~2026-05-20. No auto-refresh mechanism.
- **importMap** must be manually maintained (npx payload generate:importmap doesn't work in Linux VM).
- **Next.js canary** (16.2.0-canary.81) — stable 16.2.x not yet released.

## Step Completion Record

| Step | Description | Date | Status |
|------|-------------|------|--------|
| 1 | Security rotation | 2026-03-15 | ✅ |
| 2 | Docker network persistence | 2026-03-15 | ✅ |
| 3 | Telegram group access policy | 2026-03-15 | ✅ |
| 4 | OpenClaw → n8n intake webhook | 2026-03-15 | ✅ |
| 5 | n8n → Payload draft product creation | 2026-03-15 | ✅ |
| 6 | Media pipeline (Telegram → Payload) | 2026-03-15 | ✅ |
| 7 | Duplicate protection / idempotency | 2026-03-15 | ✅ |
| 8 | Admin review / approval flow | 2026-03-15 | ✅ |
| 9 | Inventory / variant readiness | 2026-03-15 | ✅ |
| 10 | Publishing flow / commerce activation | 2026-03-15 | ✅ |
| 11 | Caption parser enhancement | 2026-03-16 | ✅ |
| 12 | Automation settings / global toggle layer | 2026-03-16 | ✅ |
| 13 | Channel adapter scaffolding | 2026-03-16 | ✅ |
| 14 | n8n stubs + admin dispatch visibility | 2026-03-16 | ✅ |
| 15 | E2E verification + media URL hardening | 2026-03-16 | ✅ |
| 16 | Real Instagram integration (n8n workflow) | 2026-03-18 | ✅ |
| 17 | Instagram OAuth token exchange | 2026-03-22 | ✅ |
| 18 | Instagram direct publish (bypass n8n) | 2026-03-22 | ✅ |
| 19 | Facebook Page direct publish | 2026-03-22 | ✅ |
| 20 | Shopier product sync (jobs queue) | 2026-03-23 | ✅ |
