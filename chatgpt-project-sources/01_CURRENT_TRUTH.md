# Current Truth

Last updated: 2026-06-21

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

Payload now defaults new products to `draft` and blocks active creates or new activation into `status='active'` unless the product has a valid price, image, stock, active target, and clean brand-safety scan. Successful activation also sets the workflow to active/sellable so homepage eligibility is coherent. Existing active products remain editable. The content pipeline must pass central publish readiness before auto-activation. The guard has code-level smoke coverage in `npm run validate`; runtime admin/Telegram smoke remains next.
