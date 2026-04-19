# MEMORY LOCK — Uygunayakkabi

_Last updated: 2026-04-19 (Project memory cleanup — synchronized with DECISIONS.md D-168 and PROJECT_STATE.md Phase 15)_
_Purpose: Stable truths that MUST persist across all sessions. Do not re-litigate these._

---

## Identity

- **Project**: Uygunayakkabi — Telegram-first AI-assisted multi-channel commerce system
- **Domain**: uygunayakkabi.com
- **Owner**: Furkan (frk.bas34@gmail.com)
- **Repo**: https://github.com/frkbas34/uygunayakkabi-store
- **Bots**: @Uygunops_bot (primary operator bot), @Geeeeobot (content generation)

## Do NOT Restart From Scratch

This is an EXISTING production system with:
- **27 completed implementation steps** (Steps 1–27 + Phases 1–15)
- **168 locked decisions** (D-001 through D-168)
- 13 deployed AI skills (Mentix v2 on VPS/OpenClaw)
- Live Instagram + Facebook + X (Twitter) direct publish
- Live Shopier product sync (non-blocking jobs queue, GitHub Actions 5-min cron)
- **Primary product intake: Telegram → /api/telegram → Payload CMS** (direct webhook, no OpenClaw/n8n dependency)

**Any new session MUST continue from the current state, not rebuild.**

## Source of Truth Hierarchy

See **project-control/SOURCE_AUTHORITY.md** for full hierarchy and contradiction resolution rules.

Summary:
1. **Code/runtime** — always wins over documentation
2. **Safety policies** — publish/write/skill/memory/decision policies
3. **project-control/ files** — authoritative project governance (DECISIONS → PROJECT_STATE → PRODUCTION_TRUTH_MATRIX → ARCHITECTURE → TASK_QUEUE)
4. **mentix-skills/** — executable skill behavior specs
5. **mentix-memory/** — agent operational runtime memory
6. **ai-knowledge/** — secondary reference knowledge (validate before use)
7. **Raw chats** — HISTORICAL REFERENCE ONLY, never authoritative

## Phase Model

| Phase | Status | Date |
|-------|--------|------|
| Phase 1 — Core Admin + Storefront | COMPLETE | 2026-03-13 |
| Phase 2A — Controlled Product Intake (Steps 1–19) | COMPLETE | 2026-03-22 |
| Steps 20–21 — Shopier Integration + Orders | COMPLETE | 2026-03-23 |
| Steps 22–24 — Direct Telegram Webhook + Image Gen Pipeline | COMPLETE | 2026-03-28 |
| Steps 25–27 — AI Image Gen Providers (Gemini/Luma/Claid) | DEPLOYED — NOT YET PROVEN | 2026-04-01 |
| Phases 1–13 — Schema, Merchandising, Stories, Wizard, Content, Audit, Stock, Publish Readiness, Hardening | COMPLETE | 2026-04-04 |
| Phase 14 — Production Deploy + Neon Migration | COMPLETE | 2026-04-04 |
| Phase 15 — Live Smoke Test + Production Truth Validation | COMPLETE | 2026-04-04 |
| Phase 16 — Full Pipeline Validation + Wizard+Audit+Auto-fix | DEPLOYED — AWAITING OPERATOR VALIDATION | — |

## Protected Workflow Rules

These are operator-confirmed rules that must not be changed without a new explicit decision:

1. **D-096 — Direct Telegram webhook is primary product intake.** Telegram → `POST /api/telegram` → Payload CMS. The old Telegram → OpenClaw → n8n → Payload intake flow is SUPERSEDED for primary product creation. OpenClaw/Mentix remains as operations assistant, debug layer, and skill router. n8n remains as workflow/orchestration/support layer where current code still uses it.

2. **D-162 — GeoBot content generation fires only from `confirmationWizard.applyConfirmation()`.** No automatic trigger on visual approval. D-159/D-160 auto-trigger REVERTED after producing low-quality copy against placeholder titles.

3. **D-163 — Wizard commerce fields before label fields.** Order: category → productType → price → sizes → stock → stockCode → title → brand → targets → summary. Do not reorder without explicit operator decision.

4. **D-165 — No Payload `defaultValue` on business-choice fields.** Fields the wizard checks must read null if not explicitly set. Do not reintroduce `defaultValue: 'Günlük'` on category or similar.

5. **D-167 — Image pipeline padding uses mirror-extend, NOT solid color.** Sharp's `extendWith: 'mirror'` permanently replaces any solid-color padding. D-167 (commit `cef930a`). Do not reintroduce solid-color padding.

6. **D-168 — Active wizard sessions bypass group filters.** When a wizard session is active for a chat, the group-filter check is bypassed so operator text input (price, sizes, stock) is not silently dropped.

7. **Image pipeline v50 LOCKED.** `src/lib/imageProviders.ts`, `src/jobs/imageGenTask.ts` sealed at commit `c2b402a` (D-164). Any change requires a new sealed commit + DECISIONS.md update.

## Locked Stack Decisions

- **Frontend**: Next.js 16.2.0-canary.81 (DO NOT downgrade)
- **CMS**: Payload CMS v3.79.0
- **DB**: Neon PostgreSQL (push:true does NOT run in production — all schema changes must be manual SQL)
- **Media**: Vercel Blob Storage (production), local filesystem (dev)
- **VPS**: Netcup, Ubuntu 22.04.5 LTS
- **Containers**: Docker + Docker Compose
- **Reverse Proxy**: Caddy (auto-TLS)
- **Workflow/Support**: n8n at flow.uygunayakkabi.com (orchestration/support layer, NOT primary intake)
- **AI Agent/Operations**: OpenClaw at agent.uygunayakkabi.com (Mentix skills, debugging, operations — NOT primary intake)
- **AI Image Gen**: Gemini Pro (primary, v19+); OpenAI gpt-image-1 (exists as fallback — status under review)
- **AI Content Gen**: Gemini 2.5 Flash (Geobot runtime)
- **Deployment**: Vercel (storefront), VPS (automation/operations)

## Locked Architecture Rules

- Payload CMS is THE single source of truth for all product data (D-059)
- All automation creates via Payload API — never directly to DB (D-059)
- Instagram/Facebook publish directly from Payload, NOT via n8n (D-088, D-089)
- X (Twitter) publishes directly from Payload via OAuth 1.0a (D-195c)
- importMap MUST be manually maintained (D-034)
- `<img>` tags only — no next/image for product images (D-025)
- SSL in pool options, NOT in DATABASE_URI string (D-035)
- Products.slug is auto-generated and readOnly (D-040)
- External publishing requires explicit human confirmation — no auto-publish

## De-scoped / Blocked Channels

- **Dolap**: DE-SCOPED — no public API found, scaffold-only code exists. Reactivation requires a new operator decision.
- **LinkedIn**: DE-SCOPED — scaffold + OAuth callback exists, no post implementation. Reactivation requires a new operator decision.
- **Telegram Stories**: BLOCKED — Telegram Bot API does not support story publishing. Cannot implement until API support is added.
- **WhatsApp Status**: BLOCKED — official WhatsApp Business API does not support status/story publishing. Cannot implement until API support is added.

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
- D-052 to D-060: Telegram/automation/channel architecture (NOTE: D-056–D-060 have duplicate IDs — later definitions take precedence, renumbering deferred)
- D-061 to D-069: Steps 9-15 implementation decisions
- D-070 to D-076: Mentix Intelligence Layer
- D-077 to D-089: Steps 16-19 + Instagram/Facebook publish
- D-090 to D-091: Renumbered duplicates (media access, upload rule)
- D-092 to D-093: Step 20 — Shopier integration + Try-On UX decision
- D-094 to D-101: Steps 22-27 — Direct webhook, image gen pipeline, Gemini-only
- D-102 to D-115: Phases 1-13 — Schema, merchandising, stories, wizard, content, audit, stock, publish readiness, hardening
- D-116 to D-168: Phases 14-15 + wizard fixes, image pipeline locks, padding rules, session persistence
- **Next available ID: D-169** (always check DECISIONS.md before adding)
