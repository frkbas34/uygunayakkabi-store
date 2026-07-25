# Active Decisions

Last updated: 2026-07-24

## Business

- Sell and upload our own products only.
- SupplierScout is sleeping; supplier discovery and supplier-product automation
  are out of current scope.

## Channels

- Active: Website, Instagram, Facebook, X, Shopier.
- Retired: Dolap, Threads.
- Website is native storefront visibility, not an external redispatch target.

## Operations

- Payload/Next is the source of truth and execution layer.
- PR #6 merged the D-380-D-500 master-build stack into `main`; Vercel
  Production deployment `dpl_5L6CXiNjKBiqS8sp7DAuRabcG1cj` is Ready and a
  public homepage/PDP smoke passed. Live operator and integration evidence
  remain separate approval-gated work.
- Hermes/Mentix is the current agent-control and Telegram operator layer.
- OpenClaw is optional/history until explicitly reactivated and verified.
- Its legacy VPS sync requires both `--reactivate-openclaw` and
  `--confirm-vps-sync` after read-only verification; Hermes/Mentix remains
  current until that separate decision is made.
- n8n is optional fallback glue; direct Payload/Next paths are preferred.
- Shopier remains the checkout bridge; native website checkout is deferred.
- Request handlers never create or alter database schema. The confirmation
  wizard's `wizard_sessions` storage uses D-489 preflight/dry-run/approved
  apply rules like other production schema changes.

## Quality And Growth

- Product readiness, image QC, brand safety, stock, and channel gates come
  before activation or external dispatch.
- Protected-brand cleanup is manual and provenance-gated: `/brandplan` may
  diagnose stored text but must never rewrite, retire, activate, publish, or
  redispatch a product.
- `/brandreview` is preview-first; explicit confirmation records a BotEvent
  audit decision only and cannot edit a product or clear the protected-brand gate.
- A retry of the same Telegram delivery reuses that audit record instead of
  creating a duplicate decision.
- Blog publishing is operator-controlled. The first `published` transition is
  blocked for incomplete or placeholder essentials; `/blogpreflight` surfaces
  AI/evidence-sensitive wording and SEO warnings before the editor publishes.
- `manualPublishOverride` may not bypass a protected-brand match; both Publish
  Desk and the Payload activation hook keep it excluded until provenance is resolved.
- `Camper` is included in the shared protected-brand scanner. It follows the
  same manual provenance process and hard activation/public-storefront gate as
  the rest of the protected-brand list.
- Public numeric trust metrics remain hidden until all displayed values are
  verified from real business evidence and explicitly enabled in Site Settings.
- Manual ad preparation is allowed only after readiness evidence. There is no
  autonomous ad spend, Pixel/CAPI activation, or ad-platform automation.

## Change Rule

When an architecture, bot, channel, or roadmap decision changes, update these
root Obsidian notes and the matching `chatgpt-project-sources/` document in the
same local change.
