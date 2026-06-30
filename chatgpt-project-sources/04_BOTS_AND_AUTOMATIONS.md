# Bots And Automations

Last updated: 2026-06-23

## Mentix / Uygunops

Role: main operator bot.

Current intended responsibilities:

- Product intake
- Photo and caption handling
- Confirmation wizard
- Stock commands
- AI image generation commands
- Shopier commands
- Lead/order/funnel/UTM/campaign helpers
- Diagnostics and repair guidance

Needed improvements:

- Clear command ownership.
- Better product-flow debugger.
- Better output summaries.
- Safer long-running task handling.

## GeoBot

Role: content and GEO/SEO assistant.

Responsibilities:

- Product content packs
- GEO/SEO summaries
- Product audit support
- Preview and publish support
- Product intelligence handoff

Needed improvements:

- Keep operator approval in the loop.
- Ensure generated content appears in useful storefront areas.
- Avoid unsupported claims.

## Product Intelligence

Role: research and product understanding.

Responsibilities:

- Image/product analysis
- Similar product evidence
- SEO/GEO suggestions
- FAQ and buyer intent suggestions

Needed improvements:

- Decide real provider set.
- Make reports easy to approve.
- Do not auto-publish intelligence without operator confirmation.

## Image Generation Bot

Role: create usable product/social images.

Responsibilities:

- Generate AI product images from source product photos.
- Send preview.
- Attach approved generated images to generated gallery.

Needed improvements:

- Stable quality.
- Better rejection/regeneration loop.
- Clear separation of original vs generated media.

## SupplierScout

Status: dormant.

Reason: current business decision is own-products-only.

Current handling:

- Code remains.
- Collections remain.
- Vercel cron removed.
- `/api/supplier-scout` ignores actions unless `SUPPLIER_SCOUT_ENABLED=true`.
- `npm run test:supplierscout-dormant` verifies the route gate, cron absence, package scripts, and source-pack guidance.

## n8n

Status: optional glue.

Use only when a workflow is genuinely easier outside app code.

Do not build Dolap/Threads workflows.

Validation: `npm run test:n8n-optional` checks that n8n stays optional, workflow JSON files stay limited to active-channel fallback paths, package scripts do not activate n8n workflows, and Payload-first/draft-first intake guidance remains in place.

## OpenClaw

Status: useful if treated as Mentix agent brain.

Use for:

- Skills
- Reasoning
- Diagnostics
- Memory
- Operator guidance

Do not use it as an unbounded autonomous executor.

Deployment guardrail: before copying or restarting VPS OpenClaw skills, follow `mentix-skills/OPENCLAW_DEPLOYMENT_SYNC.md` and run `npm run test:mentix-skills`.
