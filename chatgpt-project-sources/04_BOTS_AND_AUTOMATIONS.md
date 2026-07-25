# Bots And Automations

Last updated: 2026-07-24

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
- Read-only product flow snapshots via `/productflow` and `/flow`
- Read-only catalog loading plan via `/loadplan` and `/loadingplan`
- Read-only live-smoke sequence guidance via `/smokeplan`

Needed improvements:

- Clear command ownership.
- Keep Hermes product-flow diagnostics grounded in `/productflow` and `/smokeplan`.
- Better output summaries.
- Safer long-running task handling.

## Hermes

Status: current agent-control layer.

Role:

- Reasoning and diagnostics for UygunAyakkabi/Mentix operations.
- Drafting operator guidance and safe next actions.
- Using Payload-backed evidence from Telegram/admin helpers instead of becoming a separate source of truth.

Guardrail: Hermes supports the operator; it does not directly become the database, publishing engine, payment system, ad system, or autonomous executor.

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
- Secret-safe provider readiness via `npm run smoke:pi-provider-health:read -- --confirm-read-only`

Needed improvements:

- Verify real production provider quota/balance/permissions before credit-spending runs.
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

Status: historical/optional unless explicitly reactivated.

Use for:

- Historical skill definitions and reusable agent-skill ideas.
- Optional future skill host only after a new operator decision.
- Verification checklists before any VPS copy, restart, or live prompt.

Do not use it as an unbounded autonomous executor.

Deployment guardrail: do not copy or restart VPS OpenClaw skills unless the operator explicitly reactivates OpenClaw. If reactivated, follow `mentix-skills/OPENCLAW_DEPLOYMENT_SYNC.md`, run `npm run test:mentix-skills`, and run standalone `npm run test:openclaw-vps-verification`. D-488 also makes `scripts/vps-deploy.sh` exit before any write, copy, or restart unless both `--reactivate-openclaw` and `--confirm-vps-sync` are supplied after read-only VPS verification evidence is recorded.

D-401 verification guardrail: `mentix-skills/OPENCLAW_VPS_VERIFICATION.md` is the read-only pre-sync checklist. Repo skill files are expected state, not proof of deployed VPS state. Do not claim OpenClaw skills are installed, loaded, or live until VPS directory evidence, log evidence, and read-only Telegram prompt evidence are recorded.

Current app-side helper: `src/lib/productFlowSnapshot.ts` powers `/productflow` and `/flow` for read-only lifecycle, readiness, activation blocker, image QC, Shopier gate, dispatch summary/rows, coherence, checklist-summary, primary operator step, operator checklist, and next-action diagnostics. The checklist is dependency-aware: confirmation comes before content generation, and content trigger/retry comes before audit. D-458 adds done/next/blocked/needs-work checklist-summary counts so Hermes/Mentix can explain product progress quickly before listing each row. D-459 adds active-channel dispatch counts so Hermes/Mentix can explain publishing health before listing each channel row. D-460 keeps each non-published channel's state, reason, and recovery command in the same row so agents can give evidence-based next steps without treating a read-only snapshot as permission to execute. Hermes/Mentix should use that evidence shape when explaining product problems instead of inventing a separate source of truth.

D-390 current repo-side skill guidance also teaches Hermes/Mentix and optional OpenClaw skills that live-smoke planning starts with Telegram `/smokeplan`. `mentix-intake` routes live-smoke requests to product-flow-debugger; product-flow-debugger tells the operator to run `/smokeplan` first and stops before queue, publish, redispatch, provider, Shopier API, or ad actions without explicit approval.

D-461 applies the same current-control truth to session-start Memory Lock files: Hermes is current, OpenClaw is optional/history, and n8n is optional glue rather than a default bot path. `test:retired-channels`, `test:n8n-optional`, and `test:mentix-skills` protect that boundary locally.

D-463 aligns the repo-side Mentix skill library with this bot ownership: Hermes/Mentix is current, while the OpenClaw skill files and dashboard are historical optional templates until explicit reactivation plus VPS verification. The skills can diagnose, draft, and guide an operator; they do not directly publish, call research providers, write durable customer memory, or prove a deployed agent service.
