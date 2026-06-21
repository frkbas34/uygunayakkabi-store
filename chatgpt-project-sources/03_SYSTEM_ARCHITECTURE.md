# System Architecture

Last updated: 2026-06-21

## Core Stack

- Next.js storefront and API routes
- Payload CMS admin and data model
- Neon/Postgres through Payload adapter
- Vercel hosting and cron
- Vercel Blob for media when configured
- Telegram bots for operator interface
- OpenClaw for agent/skill layer
- n8n for optional workflow glue
- Shopier for external checkout/sales bridge

## Source Of Truth

Payload is the source of truth.

Important collections and globals include:

- Products
- Variants
- Media
- Orders
- CustomerInquiries
- InventoryLogs
- BotEvents
- ImageGenerationJobs
- ProductIntelligenceReports
- StoryJobs
- AutomationSettings
- SiteSettings
- HomepageMerchandisingSettings

SupplierScout collections remain registered but are dormant.

## Product Activation Flow

1. Product enters Payload from admin, Telegram, or automation endpoint.
2. Product gets normalized: slug, SKU, status, stock, media, channels.
3. Readiness, audit, and safety layers determine whether publish is appropriate.
4. Activation triggers channel dispatch through app code.
5. Dispatch writes result notes back to product `sourceMeta`.

Top-level product `status` remains the storefront switch: `draft`, `active`, `soldout`. The richer roadmap lifecycle is derived in `src/lib/productLifecycle.ts`: `draft`, `needs_review`, `ready_to_publish`, `active`, `sold_out`. This avoids a schema migration while giving operators and agents a shared vocabulary.

## Publishing Paths

- Website: active products render natively.
- Instagram: direct Graph API if tokens/image are valid.
- Facebook: direct Graph API if token/page ID/image are valid.
- X: direct API path via configured credentials.
- Shopier: Payload jobs queue.
- n8n: optional fallback/scaffold path, not the main active publishing engine.

## Agent Split

The app executes commerce workflows. OpenClaw/Mentix should reason, diagnose, draft, and help the operator.

Do not let OpenClaw, n8n, and the app all compete as the system of record.

## Current Risk

The repo has historical docs and generated files that can mislead agents. This source pack should be treated as current truth.
