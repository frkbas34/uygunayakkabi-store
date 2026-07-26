# Current Truth

Last updated: 2026-07-25

## Architecture

- Payload/Next is the source of truth for products, media, orders, leads,
  stock, bot events, AI jobs, publishing status, and execution workflows.
- Hermes is the current agent-control layer on the operator PC.
- Mentix/Uygunops is the Telegram-facing commerce operator interface.
- OpenClaw is historical/optional. It is not a current deployed runtime unless
  the operator explicitly reactivates it and records VPS verification evidence.
- n8n is optional compatibility glue only. Direct Payload/Next and provider
  paths are the default.
- Shopier remains the checkout and sales bridge; website-native checkout is deferred.

## Business And Channel Scope

- Sell and upload our own products only.
- Active channels: Website, Instagram, Facebook, X, Shopier.
- Dolap and Threads are retired.
- SupplierScout is dormant. Its route ignores webhook and cron actions unless
  `SUPPLIER_SCOUT_ENABLED=true` is explicitly set.

## Product And Release State

- Canonical lifecycle: `draft`, `needs_review`, `ready_to_publish`, `active`, `sold_out`.
- Activation remains gated by media, price, sellable stock, target alignment,
  readiness, and brand safety.
- D-500 is the deployed master-build boundary. Full `npm run validate` and `npm run build`
  passed after the D-500 Meta-provider configuration alignment; the approved
  readiness reads are PII-light and read-only. PR #6 merged the reviewed stack
  into `main`, and Vercel Production deployment
  `dpl_5L6CXiNjKBiqS8sp7DAuRabcG1cj` is Ready. Public homepage and PDP smoke
  checks pass; this is not proof of live provider readiness.
- D-501 was merged through PR #7 as commit `8adfd1b`; Vercel completed the
  Production deployment successfully. It fixes the 390px PDP overflow caused by
  content-box padding outside the fixed CTA's 40/60 split using `border-box` and
  `minWidth: 0`. `test:storefront-trust`, typecheck, lint, full validation, and
  build pass; the public desktop smoke has Shopier/WhatsApp CTAs and no browser
  errors. A user-supplied Chrome DevTools responsive `390 x 844` production
  screenshot visually confirms that the fixed controls fit within the viewport
  with no visible horizontal overflow. This verifies the D-501 mobile CTA fix.
- Latest approved read-only refresh (2026-07-25): the 100/128 product sample
  has 12 protected-brand blockers, 28 failed and 25 pending Image-QC records,
  and 83 stale drafts. All 12 protected-brand rows lack a provenance decision;
  eight have stored external-dispatch history requiring manual remote-state
  verification. There are six stale open leads, no open orders, no seven-day
  funnel activity, no Shopier queue/error/retry candidates, and no `SHOPIER_PAT`
  in the smoke environment. Website and Facebook are ready, Instagram is
  disabled, X and Shopier are missing requirements; Gemini text/image are ready
  while reverse-search providers are unconfigured. These reads made no writes,
  queues, dispatches, provider calls, Shopier calls, or ad actions.
- Focused flow evidence for legacy `SN0111` (product `448`) confirms the hard
  safety gate: it is still historically `active`, but Website visibility and
  activation are blocked by Camper brand safety and Image-QC review. Stored
  dispatch history is Facebook published, Shopier queued/synced, and X failed
  for depleted credits. The only safe next action is manual external-state and
  provenance verification through `/brandreview SN0111 needs-evidence`.
- Full `npm run validate` passed after this operational refresh and source-pack
  update: typecheck, lint, and the complete safe suite are green.
- The storefront announcement bar is part of the fixed header, and `Camper`
  is included in the shared protected-brand hard gate across activation and
  public storefront eligibility.
- X direct publishing requires all four OAuth 1.0a values. Partial X
  configuration uses the optional `N8N_CHANNEL_X_WEBHOOK` fallback when present
  or records the missing credential names without a direct provider call.
  Focused dispatch/provider-health/redispatch/dispatch-state checks, full
  `npm run validate`, and `npm run build` pass locally; provider proof is
  still pending.
- Direct Instagram/Facebook dispatch scans the complete gallery for public
  HTTPS media, so a relative first image does not block a later valid image.
  Mocked adapter tests plus full `npm run validate` and `npm run build` pass
  locally; Meta delivery remains pending.
- If no public HTTPS media exists, Instagram/Facebook fail with a clear media
  reason before direct Meta or optional n8n fallback can run.
- Facebook direct dispatch and provider health both resolve the Page ID from
  deployment env `INSTAGRAM_PAGE_ID`; do not try to create or edit a removed
  `facebookPageId` field in Payload. The local config template contains only
  active fallback webhooks and the four X OAuth 1.0a keys.
- Loading plans prioritize active protected-brand exposure before draft
  protected-brand backlog; this changes review order only, never products.
- Brand remediation now shows stored external dispatch evidence for protected-
  brand items: only Facebook, Instagram, X, and Shopier `published`, `queued`,
  or `failed` notes. It is historical, read-only evidence rather than a live
  listing check or cleanup authorization.
- Brand remediation also groups provenance state and gives one read-only-safe
  next step per item. The 2026-07-25 catalog read found 13 unreviewed blockers;
  9 have stored external history that must be manually verified before cleanup.
- Protected-brand Product Flow and Image Plan diagnostics now point first to
  preview-only provenance review and withhold Image QC, generation, activation,
  Shopier, redispatch, and ad action suggestions until that review.
- The same diagnostics and their runtime smokes read the latest provenance
  BotEvent, so a recorded evidence/copy-fix/exclusion decision shows its real
  manual next step without clearing the hard brand-safety gate.
- Batch Image QC remediation now routes protected-brand items back to provenance
  before any image work and otherwise points to read-only `/imageplan` and
  Product Flow diagnostics. The 2026-07-25 sample has 55 queue items: 13 brand
  first, 28 failed QC, and 14 needing a QC decision; no mutation was made.
- `chatgpt-project-sources/` is the manual ChatGPT Project upload pack and
  is at its 20-document limit; update or merge an existing file before adding another.

## Operator Guardrails

- Use `/smokeplan` before any live Telegram, Shopier, provider, or ad action.
- `scripts/vps-deploy.sh` is historical OpenClaw-only machinery. It exits unless
  the operator deliberately supplies both reactivation flags after recording
  the read-only VPS verification evidence; Hermes/Mentix remains current.
- Confirmation wizard requests never create or alter PostgreSQL schema. The
  pre-provisioned `public.wizard_sessions` table has its own guarded D-489
  preflight and dry-run apply path; its approved 2026-07-25 metadata check
  passed.
- Lead-status requests never expose or execute enum DDL. D-490 keeps an
  incomplete deployed lead-status enum as a safe no-write result and uses a
  separately approved metadata preflight plus dry-run apply path; its approved
  2026-07-25 metadata check passed with every required value present.
- Lead-to-order conversion never assumes `orders.related_inquiry_id` exists.
  D-491 blocks the conversion before an order write when its deployed column
  or foreign key is unavailable, then directs only to a separately approved
  metadata preflight and dry-run-first apply path; its approved 2026-07-25
  metadata check passed with the nullable integer column and foreign key present.
- Use `/brandplan` to review protected-brand blockers. It is read-only; rewrite
  wording only after verifying the product is an unbranded own product.
- Use `/brandreview <id-or-sn> needs-evidence|unbranded-copy-fix|not-approved`
  to preview a provenance decision. Only its explicit `confirm` form records one
  BotEvent; it never edits a product or clears the protected-brand hard gate.
- The same Telegram delivery is idempotent: it returns the existing review rather
  than recording a duplicate BotEvent.
- BlogPosts require title, slug, excerpt, and readable body essentials on their
  first transition to `published`. Use `/blogpreflight <id-or-slug>` for the
  read-only AI/claim/SEO review before an intentional editorial publication.
- D-481 declares `shopierOrderId` unique and exits inbound duplicate-key
  creates before stock mutation. The approved 2026-07-25 concurrent partial
  index apply completed, and its post-apply read-only check confirms
  `orders_shopier_order_id_unique_idx` is present with zero duplicate non-empty
  IDs. `npm run test:shopier-webhook-local` also passes. This is configured-
  database schema evidence, not live Shopier webhook-delivery evidence.
- D-482 creates the Shopier order and its stock/inventory-log changes inside one
  Payload transaction. A transaction-start or verified processing failure returns
  `500` for Shopier retry, and the Shopier alert is emitted only after commit.
  The configured database now supplies D-481 concurrent duplicate protection;
  live Shopier webhook delivery remains separately unverified.
- D-483 makes non-Shopier order stock fail closed as well: product/variant stock,
  InventoryLog, and stock reaction retain the parent Payload request; unresolved
  product/size/variant or insufficient stock throws so the parent order create
  rolls back. `npm run test:order-stock-transaction` is local-only proof.
- D-484 closes the remaining concurrent-order race for non-Shopier stock. The
  parent transaction now uses a conditional PostgreSQL reservation update with
  `stock >= quantity`; a competing final-unit order receives no row and rolls
  back before an InventoryLog is written. This is local-only code proof, not
  live database evidence.
- D-485 applies matching arithmetic safety to paid Shopier orders. Its webhook
  transaction now uses floor-at-zero PostgreSQL decrements for product totals
  and selected variants, so concurrent distinct external orders cannot leave a
  falsely high local stock value. It preserves the paid-order record and audit;
  this is local-only code proof; its D-481 database index dependency is already
  applied and verified separately.
- D-486 makes the public PDP use original media when no generated-gallery URL
  is usable, uses the same resolved gallery in Product JSON-LD, derives schema
  availability from shared sellable-stock truth, and safely serializes inline
  schema. It is local-only storefront behavior; no Payload data is changed.
- D-487 moves that safe inline JSON-LD serialization into a shared helper and
  applies it to Blog Article schema as well as PDP Product/FAQ schema. It is
  local-only rendering hardening; no BlogPost or product data is changed.
- `manualPublishOverride` cannot activate a protected-brand product; brand safety
  remains a hard gate in both Publish Desk and the Payload hook.
- `npm run test:product-workflow` keeps the clean own-product path coherent from
  active-channel target normalization through publish-ready activation defaults.
- Turbopack is pinned to this repository root, so local builds do not infer the
  parent home-directory lockfile as the workspace.
- Product Flow Snapshot displays a stock-number reference but emits the numeric
  Payload ID in its action commands so ID-only Telegram actions remain usable.
- Public storefront eligibility also excludes placeholder-title and protected-brand
  legacy records from rails, PDPs, metadata, and sitemap URLs without altering
  their Payload record.
- Homepage numeric trust metrics are hidden by default. Enable them only after all
  three Site Settings values have been verified against real business evidence.
- Product Flow reports Website as blocked unless the product is both public-status
  and storefront-safe; a stale website dispatch note cannot make a draft look live.
- Operator PDP links and ad UTM examples use that same public-storefront rule, so
  a protected-brand or placeholder record keeps its admin link but cannot surface a dead public link.
- The direct Telegram `/utm` command applies the same rule and additionally requires
  active status before returning a marketing link.
- Do not activate SupplierScout, retired channels, optional OpenClaw, n8n
  workflows, or ad spend without an explicit operator decision.
- Do not run database metadata checks, DDL, live webhooks, or deployments
  without explicit operator approval.
