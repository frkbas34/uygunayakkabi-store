# MEMORY LOCK — Uygunayakkabi
_Consolidated: 2026-07-24 (D-461 current-control truth reconciliation)_
_These truths are stable and MUST persist across all sessions. Do not re-litigate._

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
- Current Telegram operator path: Mentix/Uygunops → Next/Payload. Hermes is the current agent-control layer; OpenClaw and n8n are optional only when explicitly reactivated or needed.

**Any new session MUST continue from the current state, not rebuild.**

When starting a new session:
1. Read `project-control/MEMORY_LOCK.md` (this file)
2. Read `project-control/PROJECT_STATE.md` for current state
3. Read `project-control/TASK_QUEUE.md` for what to do next
4. Read `project-control/DECISIONS.md` for locked constraints
5. **Never redesign the architecture** unless the user explicitly requests it

## Source of Truth Hierarchy

1. **Code/runtime** — always wins over documentation
2. **project-control/ files** — authoritative project memory
3. **ai-knowledge/ files** — reusable reference knowledge
4. **Raw chats** — reference only, NOT authoritative

---

## Phase Model

| Phase | Status | Date |
|-------|--------|------|
| Phase 1 — Core Admin + Storefront | ✅ COMPLETE | 2026-03-13 |
| Phase 2A — Controlled Product Intake (Steps 1–15) | ✅ COMPLETE | 2026-03-16 |
| Master Phases 0-1 — Control and Validation | ✅ Current truth and `npm run validate` are the local baseline | 2026-07-24 |
| Master Phase 2 — Core Product Workflow | 🟡 Active local build focus | 2026-07-24 |
| Channel policy | CURRENT ACTIVE CHANNELS: Website/Instagram/Facebook/X/Shopier; Dolap/Threads retired | 2026-07-24 |

---

## Locked Stack Decisions

- **Frontend**: Next.js 16.2.0-canary.81 (DO NOT downgrade)
- **CMS**: Payload CMS v3.79.0
- **DB**: Neon PostgreSQL (push:true — switch to migrations before Phase 3)
- **Media**: Vercel Blob Storage (production), local filesystem (dev)
- **VPS**: Netcup, Ubuntu 22.04.5 LTS
- **Containers**: Docker + Docker Compose
- **Reverse Proxy**: Caddy (auto-TLS)
- **Workflow glue**: n8n is optional; do not make it a required intake, publishing, or deploy dependency.
- **Agent control**: Hermes is current for Mentix/Uygunops operations. OpenClaw is historical/optional and requires explicit reactivation plus VPS verification before use.
- **AI Model**: OpenAI gpt-5-mini
- **Deployment**: Vercel (storefront), VPS (automation)

---

## Locked Architecture Rules

- Payload CMS is THE single source of truth for all product data (D-059)
- Payload/Next is the current execution layer for product, storefront, publishing, jobs, and bot workflows.
- All automation creates via Payload API — never directly to DB (D-059)
- Instagram/Facebook publish directly from Payload, NOT via n8n (D-088, D-089)
- Shopier sync via Payload jobs queue + GitHub Actions cron, NOT via n8n (Step 20)
- importMap MUST be manually maintained (D-034)
- `<img>` tags only — no next/image for product images (D-025)
- SSL in pool options, NOT in DATABASE_URI string (D-035)
- Products.slug is auto-generated and readOnly (D-040)
- SupplierScout is dormant for the own-products-only strategy. Do not activate, schedule, or extend it without explicit operator reversal.

---

## Locked Pipeline Invariants

- Automation endpoints (`/api/automation/*`) use `X-Automation-Secret` header auth — not API key auth (D-062)
- Automation creates **draft products** by default (unless `autoActivateProducts` toggle is on)
- Idempotency: `telegramChatId + telegramMessageId` pair prevents duplicate products
- `beforeChange` hook blocks activation if `price ≤ 0` (exempt for automation creates)
- Draft slugs return 404 on public storefront — intentional publish protection
- `products.category`, `products.brand`, `variants.size` must remain `type: 'text'` — varchar in DB

---

## Locked Operational Rules

- Always `git pull origin main` before starting work (D-042)
- Always upload media via production admin, not localhost (D-091)
- Token rotation required when secrets are exposed (D-050)
- Instagram long-lived token expires ~60 days — refresh before 2026-05-20
- Shopier PAT expires 2031-03-23 (no rotation needed for 5+ years)
- Never include `sslmode=require` in DATABASE_URI string — use pool options
- importMap.ts must be updated manually when new Payload client components are added

---

## Authorized Telegram Users

| User | Telegram ID | Role |
|------|-------------|------|
| Furkan | 5450039553 | Owner |
| Sabri | 8049990232 | Ops |
| Bahriyar | 5232747260 | Ops |

---

## Mentix Bot Current Control

- Bot username: `mentix_aibot`
- Hermes is the current agent-control layer for diagnostics, drafting, and operator support.
- OpenClaw VPS paths and repo skills are historical/optional, not proof of live deployment. Explicit reactivation requires `mentix-skills/OPENCLAW_VPS_VERIFICATION.md`.
- n8n intake is optional glue, not a default webhook dependency. Direct Payload/Next remains the default path.
- Keep active-channel and own-products-only decisions in `AGENTS.md`, `CLAUDE.md`, and `chatgpt-project-sources/` synchronized.

---

## Security Rules

- Tokens, API keys, passwords must NEVER be committed to the repo
- Security rotation completed 2026-03-15 — all original exposed secrets are invalid
- Do not expose VPS root credentials or bot tokens in prompts or memory files

---

## Decision ID Registry

- Decision identifiers are historical and not sequential. Always inspect `project-control/DECISIONS.md`, `PROJECT_STATE.md`, and `TASK_QUEUE.md` before adding a checkpoint.

---

## Memory Governance

- Authoritative files: `PROJECT_STATE.md`, `ARCHITECTURE.md`, `TASK_QUEUE.md`, `DECISIONS.md`
- Knowledge layer: `ai-knowledge/**` (non-authoritative — validate before promoting)
- Raw chats: `ai-knowledge/raw-chats/` — lowest priority, supporting material only
- Classify content as: VERIFIED / INFERRED / ASSUMED / CONFLICTING / PROPOSED when uncertain
- Do not pollute core memory with speculative content

## Current Agent And Automation Truth

- Mentix/Uygunops is the Telegram-facing operator identity; the Next/Payload Telegram route executes commerce workflows.
- Hermes is the current agent-control layer for reasoning, diagnostics, drafting, and operator support.
- OpenClaw is historical/optional. Repo files are not evidence that it is deployed; use `mentix-skills/OPENCLAW_VPS_VERIFICATION.md` only after explicit reactivation.
- n8n is optional glue. Direct Payload/Next remains the default; do not add new workflows unless a current operator need is verified.
- Active channels are Website, Instagram, Facebook, X, and Shopier. Dolap and Threads are retired. SupplierScout is dormant.
