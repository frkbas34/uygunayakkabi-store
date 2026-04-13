# ARCHITECTURE — Uygunayakkabi (Consolidated)

_Last consolidated: 2026-03-23_

## System Overview

Telegram-first, AI-assisted, multi-channel commerce engine. Products flow from Telegram → AI agent → workflow engine → Payload CMS (source of truth) → multiple distribution channels.

## Core Stack

### Storefront + CMS (Vercel)
- **Runtime**: Next.js 16.2.0-canary.81 (App Router) + React 19.2.3
- **CMS/Admin**: Payload CMS v3.79.0
- **Database**: Neon PostgreSQL (Drizzle ORM, push:true — NOT active in production)
- **Rich Text**: Lexical editor
- **Media**: Vercel Blob Storage (production), local filesystem (dev)
- **i18n**: Turkish default
- **Styling**: Inline-style token system (storefront), default Payload theme (admin)

### Automation Infrastructure (VPS — Netcup)
- **OS**: Ubuntu 22.04.5 LTS
- **Containerization**: Docker + Docker Compose
- **Reverse Proxy**: Caddy (auto-TLS)
- **Workflow Engine**: n8n → flow.uygunayakkabi.com
- **AI Agent**: OpenClaw → agent.uygunayakkabi.com
- **Bot**: @mentix_aibot (Telegram)
- **AI Model**: OpenAI gpt-5-mini

### Mentix Intelligence Layer v2
- 13 skills deployed: mentix-intake, product-flow-debugger, skill-vetter, browser-automation, sql-toolkit, agent-memory, github-workflow, uptime-kuma, eachlabs-image-edit, upload-post, research-cog, senior-backend, learning-engine
- 3 activation levels: A (active), B (controlled), C (observe-only)
- 12-layer memory system at mentix-memory/
- Formal 12-field decision schema with confidence gate

## Data Flows

### Product Intake (Telegram → Payload)
```
Phone → Telegram Group (@mention) → mentix_aibot
  ↓
OpenClaw (mentix-intake skill — intent parsing)
  ↓
n8n webhook (curl via Docker internal network)
  ↓
n8n: Parse Fields → POST /api/automation/products (draft)
  ↓
n8n: Has Media? → POST /api/automation/attach-media
  ↓
Payload CMS (Neon DB) — admin review or auto-activate per toggle
```

### Channel Distribution (Payload → Channels)
```
Product activated (status → active) OR forceRedispatch
  ↓
afterChange hook → dispatchProductToChannels()
  ↓
Per-channel eligibility: global capability ∩ product channelTargets ∩ channel flag
  ├── Website: native (active products appear on storefront)
  ├── Instagram: publishInstagramDirectly() — Graph API v21.0, 3-step
  ├── Facebook: publishFacebookDirectly() — Page Access Token → photo post
  ├── Shopier: Payload jobs queue → shopierSyncTask → Shopier REST API
  ├── Dolap: scaffold only (n8n stub)
  ├── X/Threads: scaffold only (n8n stubs)
  └── Results written to sourceMeta.dispatchNotes
```

### Storefront Request Flow
```
page.tsx (Server Component, force-dynamic)
  → Fetch products (active only), SiteSettings, Banners, reverse media lookup
  → Pass as props to UygunApp.jsx (Client SPA)
  → objectFit: contain, hover crossfade preview, no next/image
```

## Key Directories

```
src/
├── app/(app)/          # Storefront (UygunApp.jsx, page.tsx, products/[slug])
├── app/(payload)/      # Admin panel (importMap.ts — manual)
├── app/api/            # Custom endpoints (automation, auth, webhooks)
├── collections/        # 11 Payload collections
├── globals/            # SiteSettings, AutomationSettings
├── components/admin/   # ReviewPanel, SourceBadgeCell, StatusCell
├── lib/                # automationDecision.ts, channelDispatch.ts, telegram.ts, shopierApi.ts, shopierSync.ts
├── jobs/               # shopierSyncTask.ts (Payload jobs queue)

n8n-workflows/          # VCS-tracked workflow JSONs + contract docs
mentix-skills/          # 13 skill SKILL.md files + matrix
mentix-memory/          # 12-layer structured memory (policies, runbooks, traces, evals)
project-control/        # Project memory files (authoritative)
ai-knowledge/           # Reference knowledge + raw chat archives
```

## Domain Architecture

| Domain | Components | Status |
|--------|-----------|--------|
| Catalog | Products, Variants, Brands, Categories, Media | ✅ Live |
| Commerce | Orders, CustomerInquiries, InventoryLogs | ✅ Live |
| Marketing | Banners, SiteSettings | ✅ Live |
| Intake | Telegram → OpenClaw → n8n → Payload API | ✅ Live |
| Distribution | channelDispatch.ts → Instagram/Facebook/Shopier | ✅ Partially Live |
| Content | BlogPosts collection, AutomationSettings | 📋 Scaffold |
| Visual | AI expansion engine, try-on widget | 📋 Planned |

## Infrastructure Layout

```
Vercel (uygunayakkabi.com)
├── Next.js storefront + Payload admin + API routes
├── Neon PostgreSQL (database)
└── Vercel Blob Storage (media)

VPS (Netcup)
├── /opt/caddy/     → Caddy (reverse proxy, auto-TLS)
├── /opt/n8n/       → n8n (workflow engine)
├── /opt/openclaw/  → OpenClaw (AI agent, Docker)
└── /home/furkan/.openclaw/
    ├── openclaw.json (config)
    ├── skills/ (13 Mentix skills)
    └── mentix-memory/ (12-layer memory)

DNS (Cloudflare)
├── uygunayakkabi.com → Vercel
├── flow.uygunayakkabi.com → VPS → Caddy → n8n:5678
└── agent.uygunayakkabi.com → VPS → Caddy → openclaw:18789
```

## Locked Constraints

- Next.js 16.2.0-canary.81 — DO NOT downgrade (Payload incompatible with 15.5–16.1.x)
- importMap must be manually maintained
- push:true does NOT run in production — manual SQL verification required
- `<img>` tags only (no next/image) for product images
- SSL in pool options, NOT in DATABASE_URI string
- Instagram/Facebook publish directly from Payload, NOT via n8n
- Payload is THE single source of truth — all automation creates via Payload API
