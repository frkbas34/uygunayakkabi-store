# MEMORY LOCK — Uygunayakkabi

_Last updated: 2026-03-23 (Consolidated — Step 20 complete)_
_Purpose: Stable truths that MUST persist across all sessions. Do not re-litigate these._

---

## Identity

- **Project**: Uygunayakkabi — Telegram-first AI-assisted multi-channel commerce system
- **Domain**: uygunayakkabi.com
- **Owner**: Furkan (frk.bas34@gmail.com)
- **Repo**: https://github.com/frkbas34/uygunayakkabi-store
- **Bot**: @mentix_aibot (Telegram)

## Do NOT Restart From Scratch

This is an EXISTING production system with:
- **20 completed implementation steps**
- 92+ locked decisions
- 13 deployed AI skills (Mentix v2)
- Live Instagram + Facebook direct publish
- **Live Shopier product sync** (non-blocking jobs queue, GitHub Actions 5-min cron)
- Live Telegram → OpenClaw → n8n → Payload pipeline

**Any new session MUST continue from the current state, not rebuild.**

## Source of Truth Hierarchy

1. **Code/runtime** — always wins over documentation
2. **project-control/ files** — authoritative project memory
3. **ai-knowledge/ files** — reusable reference knowledge
4. **Raw chats** — reference only, NOT authoritative

## Phase Model

| Phase | Status | Date |
|-------|--------|------|
| Phase 1 — Core Admin + Storefront | ✅ COMPLETE | 2026-03-13 |
| Phase 2A — Controlled Product Intake | ✅ Steps 1-19 COMPLETE | 2026-03-22 |
| Phase 2B — Multi-Channel Distribution | 🟡 IN PROGRESS (IG+FB+Shopier live, Dolap scaffold) | 2026-03-23 |
| Phase 2C — Content Growth Layer | 📋 PLANNED | — |
| Phase 3 — Visual & Experience | 📋 PLANNED | — |

## Locked Stack Decisions

- **Frontend**: Next.js 16.2.0-canary.81 (DO NOT downgrade)
- **CMS**: Payload CMS v3.79.0
- **DB**: Neon PostgreSQL (push:true — switch to migrations before Phase 3)
- **Media**: Vercel Blob Storage (production), local filesystem (dev)
- **VPS**: Netcup, Ubuntu 22.04.5 LTS
- **Containers**: Docker + Docker Compose
- **Reverse Proxy**: Caddy (auto-TLS)
- **Workflow**: n8n at flow.uygunayakkabi.com
- **AI Agent**: OpenClaw at agent.uygunayakkabi.com
- **AI Model**: OpenAI gpt-5-mini
- **Deployment**: Vercel (storefront), VPS (automation)

## Locked Architecture Rules

- Payload CMS is THE single source of truth for all product data (D-059)
- All automation creates via Payload API — never directly to DB (D-059)
- Instagram/Facebook publish directly from Payload, NOT via n8n (D-088, D-089)
- importMap MUST be manually maintained (D-034)
- `<img>` tags only — no next/image for product images (D-025)
- SSL in pool options, NOT in DATABASE_URI string (D-035)
- Products.slug is auto-generated and readOnly (D-040)

## Locked Operational Rules

- Always `git pull origin main` before starting work (D-042)
- Always upload media via production admin, not localhost (D-091)
- Token rotation required when secrets are exposed (D-050)
- Instagram long-lived token expires ~60 days — refresh before 2026-05-20

## Authorized Telegram Users

| User | Telegram ID | Role |
|------|-------------|------|
| Furkan | 5450039553 | Owner |
| Sabri | 8049990232 | Ops |
| Bahriyar | 5232747260 | Ops |

## Decision ID Registry

- D-001 to D-051: Core decisions (Phase 1 + early Phase 2)
- D-052 to D-060: Telegram/automation/channel architecture
- D-061 to D-069: Steps 9-15 implementation decisions
- D-070 to D-076: Mentix Intelligence Layer
- D-077 to D-089: Steps 16-19 + Instagram/Facebook publish
- D-090 to D-091: Renumbered duplicates (media access, upload rule)
- D-092 to D-09x: Step 20 — Shopier integration decisions
- D-093: Try-On Is UX Layer Only (renumbered from D-060/D-087 collision)
- **⚠️ Next available ID: D-094** (check DECISIONS.md before adding)
