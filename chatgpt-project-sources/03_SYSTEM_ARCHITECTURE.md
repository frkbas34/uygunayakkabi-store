# System Architecture

Last updated: 2026-07-25

## Core Stack

- Next.js storefront and API routes
- Payload CMS admin and data model
- Neon/Postgres through Payload adapter
- Vercel hosting and cron
- Vercel Blob for media when configured
- Telegram bots for operator interface
- Hermes for the current agent-control layer
- OpenClaw retained as historical/optional skill infrastructure unless explicitly reactivated
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

Central publish readiness remains a 6-dimension signal in `src/lib/publishReadiness.ts`, but the dimensions now align more closely with Payload activation: usable media rows, valid price, positive stock or variant stock, active target channels only, and brand safety inside the audit/safety dimension.

## Publishing Paths

- Website: active products render natively.
- Instagram: direct Graph API if tokens and any gallery image are publicly
  reachable over HTTPS.
- Facebook: direct Graph API if token/page ID and any gallery image are
  publicly reachable over HTTPS.
- X: direct API path only with all four OAuth 1.0a values (`X_API_KEY`,
  `X_API_SECRET`, `X_ACCESS_TOKEN`, `X_ACCESS_TOKEN_SECRET`); otherwise the
  optional `N8N_CHANNEL_X_WEBHOOK` fallback may be used. Partial OAuth never
  attempts a direct API call.
- Shopier: Payload jobs queue.
- n8n: optional fallback/scaffold path, not the main active publishing engine.

StoryJobs are non-blocking and do not replace channel dispatch. Story dispatch now runs the same brand-safety scan before job creation; protected-brand products record a failed story status instead of queueing a future social/story job.

## Agent Split

The app executes commerce workflows. Hermes/Mentix should reason, diagnose, draft, and help the operator.

Do not let Hermes, optional OpenClaw, n8n, and the app all compete as the system of record. Payload/Next remains the execution and data layer.

## Current Risk

The repo has historical docs and generated files that can mislead agents. This source pack should be treated as current truth.
