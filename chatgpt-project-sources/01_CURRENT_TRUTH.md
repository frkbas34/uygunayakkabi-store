# Current Truth

Last updated: 2026-06-22

## North Star

UygunAyakkabi is a Telegram-first, AI-assisted commerce system for selling and uploading our own products only.

Payload is the source of truth. Products, media, orders, leads, stock, bot events, AI jobs, and publishing status should resolve back to Payload data.

## Active Channels

- Website
- Instagram
- Facebook
- X
- Shopier

## Retired Or Dormant

- Dolap: removed from active channel model.
- Threads: removed from active channel model.
- SupplierScout: dormant. Code remains, but the business decision is own-products-only.
- n8n: optional glue, not the main system brain.

## Bot Roles

- Mentix/Uygunops: operator bot for product intake, stock, image generation, diagnostics, publishing helpers, leads, orders, funnel.
- GeoBot: content, GEO/SEO, audits, product intelligence handoff, preview/publish support.
- OpenClaw: intended agent brain and skill host for Mentix-style reasoning.
- Next/Payload Telegram route: operational bot API layer and product workflow executor.

## Main Strategy

Keep the system narrow and reliable before adding more automation:

1. Make product intake and admin review excellent.
2. Make active channel publishing explainable and retryable.
3. Make Mentix useful as an operator assistant.
4. Keep Obsidian and this source pack as current project memory.
5. Use GitHub/repo tasks for execution.

## Current Architecture Bias

Prefer direct app code for core commerce logic:

- Product state: Payload
- Website: Next.js
- Shopier: Payload jobs
- Instagram/Facebook/X: direct dispatch when credentials exist
- n8n: optional workflow bridge
- OpenClaw/Mentix: high-level agent behavior and skills

## Current Product Guard

Payload now defaults new products to `draft` and blocks active creates or new activation into `status='active'` unless the product has a valid price, image, stock, active target, and clean brand-safety scan. Successful activation also sets the workflow to active/sellable so homepage eligibility is coherent. Existing active products remain editable. Automation intake and content generation now stop at draft/ready state; activation requires an explicit operator action through admin, `/activate`, `/approvepublish`, Publish Desk, or the GeoBot `Yayına Al` button. The guard has code-level smoke coverage in `npm run validate`.

Runtime activation diagnostics now have a read-only command: `npm run smoke:activation:read -- --product=<id> --confirm-read-only`. It forces `PAYLOAD_DB_PUSH=false`, reads one Payload product, and reports lifecycle, readiness, stock, targets, activation blockers, and coherence issues without writing or dispatching. Product `359` passed this read-only smoke on 2026-06-22 with readiness `6/6`, effective stock `10`, all active targets, no activation blockers, and no coherence issues.

Runtime activation mutation proof now exists through `npm run smoke:activation:mutate`. Existing-product mode requires a website-only `SMOKE`/`TEST` draft plus `--confirm-mutate-and-rollback`. Temp helper mode uses `--create-temp-smoke --confirm-create-mutate-delete`; it creates a website-only smoke draft, activates through `approveAndActivateProduct()`, verifies `status=active`, restores, deletes captured smoke bot-events, and deletes the temp product. Temp admin-direct mode adds `--admin-direct-update`; it activates through a plain Payload `status='active'` update, matching a direct admin save. Both temp paths passed on 2026-06-22: helper path product `363` cleaned up two smoke bot-events, admin-direct path product `364` normalized `workflowStatus=active` and `publishStatus=published`, no external channel dispatched, and no Shopier job queued. Manual operator UI/Telegram smoke remains next.

Per-channel dispatch state is summarized by `src/lib/channelDispatchStatus.ts` and shown in ReviewPanel as published, queued, failed, blocked, preview, not configured, or skipped.

External dispatch eligibility is covered by `src/lib/channelDispatch.test.ts`. The only external dispatch channels are Instagram, Shopier, X, and Facebook; Website is native; Dolap and Threads cannot become dispatch-eligible.

Telegram redispatch is covered by `src/lib/operatorActionsRedispatch.test.ts`; it is one-channel only and preserves other channel notes.

Telegram caption parsing now recognizes all active channel targets: Website, Instagram, Shopier, X, and Facebook. `twitter` maps to X, `fb` maps to Facebook, and legacy `Instagram: evet` maps to Website + Instagram. Parser and automation-decision tests prove Dolap/Threads do not come back through caption/channel target handling. The Telegram legacy photo+caption fallback uses `resolveChannelTargets()` and sets all active channel flags from effective targets.
