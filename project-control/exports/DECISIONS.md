# DECISIONS — Uygunayakkabi (Consolidated Summary)

_Last consolidated: 2026-03-23. Full decisions in project-control/DECISIONS.md (89+ entries)._

## Core Architecture (D-001 to D-021)

| ID | Decision | Status |
|----|----------|--------|
| D-001 | Next.js as storefront framework | ACTIVE |
| D-002 | Payload CMS as admin/backend | ACTIVE |
| D-003 | Shared cloud database (Neon PostgreSQL) | ACTIVE |
| D-004 | GitHub as sync backbone | ACTIVE |
| D-005 | Admin panel is core operational control center | ACTIVE |
| D-006 | Long-term automation direction (Telegram-first) | ACTIVE |
| D-007 | project-control/ files are source of truth (not chats) | ACTIVE |
| D-009 | Phase-based build strategy (1 → 2A → 2B → 2C → 3) | ACTIVE |
| D-010 | Telegram-first commerce operation | ACTIVE |
| D-011 | AI product image workflow (preserve product integrity) | ACTIVE |
| D-012 | Multi-channel publishing (website + IG + Shopier + Dolap) | ACTIVE |
| D-014 | Payload CMS remains the admin direction | ACTIVE |
| D-018 | Admin is override/control layer | ACTIVE |
| D-019 | Product model must stay automation-compatible | ACTIVE |
| D-021 | Telegram-first commerce vision remains core | ACTIVE |

## Technical Constraints (D-022 to D-042)

| ID | Decision | Status |
|----|----------|--------|
| D-022 | Field types must match DB column types exactly | LOCKED |
| D-023 | Existing enum values cannot be changed without migration | LOCKED |
| D-025 | Use `<img>` tags, not next/image for product images | ACTIVE |
| D-028 | Turkish language as default admin language | ACTIVE |
| D-032 | Next.js 16.2.0-canary.81 — DO NOT downgrade | LOCKED |
| D-033 | Vercel Blob Storage for production media | ACTIVE |
| D-034 | importMap must be manually updated | ACTIVE |
| D-035 | SSL in pool options, not DATABASE_URI string | ACTIVE |
| D-038 | Products.category is a select field (not text) | ACTIVE |
| D-040 | Auto-generated slug and SKU via beforeValidate | ACTIVE |
| D-042 | main is only deployable branch — always pull first | ACTIVE |

## Automation & Channels (D-049 to D-069)

| ID | Decision | Status |
|----|----------|--------|
| D-049 | DM-only Telegram policy | SUPERSEDED by D-052 |
| D-051 | Always create draft products | SUPERSEDED by D-053 |
| D-052 | Allowlisted group mode (mention-only) | ACTIVE |
| D-053 | Toggle-controlled product publish | ACTIVE |
| D-054 | Per-channel publish toggles in AutomationSettings | ACTIVE |
| D-055 | Product family architecture (shoes, wallets, bags, etc.) | ACTIVE |
| D-056 | AI SEO blog engine (BlogPosts collection) | ACTIVE |
| D-057 | Visual expansion engine (2–4 additional angles) | SCAFFOLD |
| D-058 | Photo-based AI try-on (future phase) | PLANNED |
| D-059 | Payload is single source of truth for ALL channels | ACTIVE — CORE |
| D-061 | Telegram group: restricted allowlist + mention-only | ACTIVE |
| D-062 | OpenClaw → n8n transport: exec + curl via Docker network | ACTIVE |
| D-064 | Publishing flow: draft → active state machine | ACTIVE |
| D-065 | Enhanced caption parser (Turkish/English, tolerant) | ACTIVE |
| D-066 | AutomationSettings global toggle layer | ACTIVE |
| D-067 | Channel adapter scaffolding (channelDispatch.ts) | ACTIVE |

## Mentix Intelligence Layer (D-070 to D-076)

| ID | Decision | Status |
|----|----------|--------|
| D-070 | Full skill stack: 13 skills, 3 activation levels | ACTIVE |
| D-071 | File-based memory (agent-memory), not vector DB | ACTIVE |
| D-072 | Learning engine: observe-first, no auto-modification | ACTIVE |
| D-073 | Skill activation: draft-first for publishing | ACTIVE |
| D-074 | product-flow-debugger as first-class skill | ACTIVE |
| D-075 | OER separation (outcome/evaluation/reward distinct) | ACTIVE |
| D-076 | REPORT_ONLY gate always writes decision record | ACTIVE |

## Instagram/Facebook/Shopier (D-077 to D-091)

| ID | Decision | Status |
|----|----------|--------|
| D-077 | push:true unreliable on Neon — manual SQL verification needed | ACTIVE — RISK |
| D-078 | Payload v3 join tables: parent_id (no underscore) | ACTIVE |
| D-080 | Instagram: synchronous response write-back (not async) | ACTIVE |
| D-083 | Social channels: extend channelDispatch, not new architecture | ACTIVE |
| D-086 | Instagram OAuth: INSTAGRAM_USER_ID bypass for NPE pages | ACTIVE |
| D-087 | Instagram tokens stored in Payload CMS (not n8n vars) | ACTIVE |
| D-088 | Instagram published directly from Payload (n8n bypassed) | ACTIVE |
| D-089 | Facebook published directly from Payload (Graph API) | ACTIVE |

## Decision ID Registry

- D-001 to D-051: Core + Phase 1 + early Phase 2
- D-052 to D-060: Telegram/automation/channel architecture
- D-061 to D-069: Steps 9–15 implementation
- D-070 to D-076: Mentix Intelligence Layer
- D-077 to D-089: Steps 16–19 (Instagram/Facebook)
- D-090 to D-091: Renumbered duplicates (media access, upload rule)
- **Next available ID: D-092**
