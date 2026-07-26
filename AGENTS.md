# AGENTS.md

Current repository instructions. Last updated: 2026-07-26.

## Project Direction

UygunAyakkabi is a Telegram-first, AI-assisted commerce system for selling and uploading our own products only. Payload is the source of truth for products, media, orders, leads, stock, bot events, AI jobs, and publishing status.

## Fixed Boundaries

- Active channels: Website, Instagram, Facebook, X, and Shopier.
- Do not reintroduce Dolap or Threads. They are retired.
- SupplierScout is dormant. Do not activate it, add cron, register its webhook, or build supplier-product workflows unless the operator explicitly reverses the decision.
- The protected-brand catalog backlog is deferred. Keep brand safety at product/authenticity claims, operator approval, storefront activation, publishing, advertising, and external dispatch; do not automatically rewrite, unpublish, archive, redispatch, or remove records. Brand classification must never block AI image generation.
- Shopier remains the checkout/sales bridge. Website-native checkout is deferred.
- n8n is optional glue only. Do not add workflows without a demonstrated current need.
- Hermes is the current agent-control layer. Mentix/Uygunops is the Telegram commerce operator identity. OpenClaw is historical/optional unless explicitly reactivated.

## Architecture

- Next/Payload owns product, storefront, publishing, jobs, and database workflows.
- Payload Postgres and Media/Vercel Blob are authoritative persistence surfaces.
- Payload jobs include guarded `image-gen` and `shopier-sync` tasks.
- Vercel calls `/api/payload-jobs/run` every 30 minutes. The GitHub job runner is manual, not scheduled.
- Do not treat local env readiness as production provider readiness.

## Current Priority

Telegram operator productivity is the primary engineering focus. Image generation is the highest-priority subsystem. Before redesigning prompts, cameras, slots, or providers, address these foundations in order:

1. Telegram webhook secret and empty allowlists can fail open; callback actions also need the same fail-closed authorization boundary as messages.
2. Partial image-slot and Media-save results can be mislabeled because successful buffers are compacted while slot metadata remains positional.
3. Rejected/regenerated/unapproved generated Media lacks a complete retention and cleanup lifecycle.
4. Image attempts, per-slot lineage, provider usage, retry state, and long-running Telegram progress are not durably modeled.
5. `src/app/api/telegram/route.ts` is a 7,820-line command hotspot and needs characterization before behavior-preserving decomposition.

The earlier recommendation to restore `imageBrandGate` is rejected. Its unused helper/test and brand-first generation advice are policy residue to remove in a separately authorized implementation change. This does not authorize protected-brand catalog cleanup or weaken downstream publishing/claims/approval/dispatch guards.

## Operator Safety

- Read first. Preserve dirty worktrees and user changes.
- Preview and diagnose before any queue, publish, redispatch, provider, Shopier, ad, schema, or production action.
- Never execute an action based on confidence. Require the relevant explicit approval.
- Content approval is only approval of copy.
- Manual ad tools may draft/read/report only. They must not create campaigns, posts, pixels, provider calls, Shopier calls, or spend.
- Do not run live Telegram, database, provider, Shopier, or OpenClaw work unless explicitly requested.
- Do not print or paste secrets. A secret-safe evidence record is evidence, not authorization.

## Image Generation

- `project-control/IMAGE_GENERATION_BLUEPRINT_V1.md` is the canonical target architecture for all future image-generation implementation. Current code and dated audits remain authoritative for behavior that exists today.
- `project-control/PRODUCT_UNDERSTANDING_LAYER_V1.md` is the canonical pre-prompt product identity, evidence, uncertainty, operator-override, and Generation Profile selection design. Implement its operator-assisted phases before automatic classification or prompt/profile behavior changes.
- `project-control/VISUAL_CONSISTENCY_ENGINE_V1.md` is the canonical Digital Product Identity, Identity Anchor, Visual Contract, geometry/bounding, durable slot, regeneration-consistency, and drift-assessment design. It specifies deterministic metadata and evaluation, not crop correction, camera angles, or prompt/provider changes.
- `project-control/GOLDEN_PRODUCT_SET_V1.md` and `project-control/golden-product-set-v1/` are the canonical local evidence corpus. V1 has 1 draft candidate, 0 approved products, and 0 loafers against the 36/12 target, so visual-quality calibration and regression enforcement remain blocked pending original sources and operator review. Separately authorized pure metadata contracts and durable slot identity work may proceed because it does not require visual-quality calibration.
- Current operator generation is Gemini-first through `#gorsel`, `#geminipro`, inline controls, and `imageGenTask`.
- Image generation must remain available to every product with a valid reference input; protected-brand classification is never a generation eligibility gate.
- The standard contract is five slots. Legacy OpenAI prompt/provider code is retained compatibility code, not the default.
- Reference identity, product fidelity, centering/background normalization, pair handling, stock-number overlay, upscale, preview, approval, and Image QC are distinct gates.
- Generated Media requires structured Image QC PASS before public/Shopier/ad use.
- Do not delete originals or generated Media without an explicit, verified target and retention decision.

## Telegram and Shopier

- Telegram commands are interfaces over Payload, never an alternative source of truth.
- Single and batch Shopier commands must use the shared evaluator and `queueShopierSync()` gate.
- Preview commands remain read-only. Confirmed commands still require configured credentials and operator approval.
- Protected-brand, Image QC, public-media, stock, order/refund idempotency, and confirmation guards must not be bypassed.

## Documentation

- `chatgpt-project-sources` contains the canonical 20-file current-truth pack; do not exceed 20 Markdown files.
- Keep current control docs concise. Link to historical evidence instead of appending milestone ledgers.
- `ai-knowledge/raw-chat-archives`, ignored `sessions`, `tmp`, and `backups`, historical soak scripts, and destructive cleanup scripts are not current instructions.
- See `project-control/REPOSITORY_HEALTH_AUDIT_2026-07-26.md` for the latest repository-wide audit.
- See `project-control/IMAGE_GENERATION_BLUEPRINT_V1.md` for the canonical future image-platform specification.
- See `project-control/PRODUCT_UNDERSTANDING_LAYER_V1.md` for the canonical Product Understanding Layer specification.
- See `project-control/VISUAL_CONSISTENCY_ENGINE_V1.md` for the canonical five-slot visual-consistency specification.
- See `project-control/GOLDEN_PRODUCT_SET_V1.md` for corpus readiness, source rules, review governance, and the exact next runtime task.

## Validation

Normal local sequence:

1. Focused test(s).
2. `npm run typecheck`
3. `npm run lint`
4. `npm run test:safe`
5. `npm run validate`
6. `npm run build`

Important governance checks include `test:shopier-commands`, `test:provider-reality`, `test:local-release-candidate`, `test:local-pr-review`, `test:ops-runbook`, `test:runtime-smokes`, `test:source-pack`, `test:image-regeneration-plan`, and `test:image-qc-remediation-plan`.

D-397 local release candidate boundary is local-only; canonical evidence is `project-control/LOCAL_RELEASE_CANDIDATE.md` and `test:local-release-candidate`.

D-398 local PR review package is local-only; canonical evidence is `project-control/LOCAL_PR_REVIEW_PACKAGE.md` and `test:local-pr-review`.

D-403 provider reality audit is local-only; canonical evidence is `project-control/PROVIDER_REALITY_AUDIT.md` and `test:provider-reality`; local env readiness is not production provider readiness.

`test:ad-performance` and `test:openclaw-vps-verification` are standalone checks and are not in `test:safe`. `test:shopier-webhook-local` is also safe-local but may be run explicitly when that surface changes.

## Read-only Runtime Smokes

These may connect to real Payload data. Run only with an approved target and the literal confirmation flag:

- `npm run smoke:activation:read -- --confirm-read-only`
- `npm run smoke:product-flow:read -- --product=<ref> --confirm-read-only`
- `npm run smoke:image-plan:read -- --product=<ref> --confirm-read-only`
- `npm run smoke:load-plan:read -- --confirm-read-only`
- `npm run smoke:brand-safety:read -- --confirm-read-only`
- `npm run smoke:image-qc-plan:read -- --confirm-read-only`
- `npm run smoke:provider-health:read -- --confirm-read-only`
- `npm run smoke:pi-provider-health:read -- --confirm-read-only`
- `npm run smoke:ad-readiness:read -- --confirm-read-only`
- `npm run smoke:ad-performance:read -- --confirm-read-only`
- `npm run smoke:business-funnel:read -- --confirm-read-only`
- `npm run smoke:lead-followup:read -- --confirm-read-only`
- `npm run smoke:imageqc:schema -- --confirm-read-only`
- `npm run smoke:blog-schema:read -- --confirm-read-only`
- `npm run smoke:wizard-sessions:schema -- --confirm-read-only`
- `npm run smoke:lead-status-schema:read -- --confirm-read-only`
- `npm run smoke:lead-conversion-schema:read -- --confirm-read-only`
- `npm run smoke:blog-preflight:read -- --confirm-read-only`
- `npm run smoke:shopier-order-id-schema:read -- --confirm-read-only`
- `npm run smoke:shopier:read -- --confirm-read-only`

## Historical/Optional Guardrails

- `project-control/HISTORICAL_SOAK_SCRIPTS.md` quarantines live-data soak harnesses. Never add them to normal validation.
- Optional OpenClaw verification is `mentix-skills/OPENCLAW_VPS_VERIFICATION.md`; sync requires `--reactivate-openclaw` and `--confirm-vps-sync`.
- Historical release/PR manifests remain evidence, not proof of the current checkout or production state.

## Git and External Actions

Do not stage, commit, branch, push, open a PR, deploy, mutate production data, call providers, or run live smokes unless the operator explicitly asks. Before destructive cleanup, resolve exact targets and get approval.
