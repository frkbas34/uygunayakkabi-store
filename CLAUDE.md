# CLAUDE.md

Current repository guidance. Last updated: 2026-07-26.

## Operating Truth

UygunAyakkabi is a Telegram-first commerce system for the operator's own products. Payload/Next is the source of truth for products, media, orders, leads, stock, jobs, bot events, and publishing state.

Active channels are Website, Instagram, Facebook, X, and Shopier. Do not add Dolap/Threads UI, parser targets, n8n stubs, prompts, or task items. SupplierScout is dormant. n8n is optional glue. Hermes is the current agent-control layer; OpenClaw is historical/optional unless explicitly reactivated. Shopier remains the checkout bridge.

The protected-brand backlog is deferred. Keep brand safety at product/authenticity claims, operator approval, storefront activation, publishing, advertising, dispatch, and Shopier gates; do not automatically rewrite, unpublish, archive, redispatch, or delete records. Brand classification must never block AI image generation.

## Read-first Rule

Inspect code, tests, git state, and the focused runbook before changing anything. Preserve user changes. Distinguish local tests from production evidence. Do not run live Telegram, database, provider, Shopier, OpenClaw, deployment, or ad actions without explicit approval. Never print secrets.

Never execute an action based on confidence. Content approval is only approval of copy.

## Current Engineering Focus

Telegram operator flow is the primary engineering focus and image generation is the highest-priority subsystem. Current risks are:

- Missing Telegram webhook secret and empty allowlists can fail open; callback actions need the same authorization boundary as messages.
- Partial image results can be assigned the wrong slot metadata after a slot or Media save fails.
- Generated Media rejection/regeneration lacks a complete cleanup and lineage lifecycle.
- Image attempts, retries, provider usage, and long-running Telegram progress are weakly modeled.
- The Telegram API route is a 7,820-line command/ownership hotspot.

The earlier image-generation protected-brand gate recommendation is rejected. Do not restore it. The unused helper/test and brand-first generation diagnostics are policy residue for a later scoped implementation change. Do not use this decision to activate deferred catalog cleanup or weaken downstream claims, approval, activation, publishing, advertising, dispatch, or Shopier controls.

## Runtime Contracts

- `project-control/IMAGE_GENERATION_BLUEPRINT_V1.md` is the canonical target architecture for future image-generation implementation. Current code and dated audits remain authoritative for current behavior.
- `project-control/PRODUCT_UNDERSTANDING_LAYER_V1.md` is the canonical pre-prompt product identity and Generation Profile selection design. It requires evidence, explicit uncertainty, durable operator overrides, and an operator-assisted rollout before automatic classification.
- `project-control/VISUAL_CONSISTENCY_ENGINE_V1.md` is the canonical visual-consistency design layered after Product Understanding. It defines Digital Product Identity, Identity Anchor, Visual/Geometry/Slot contracts, immutable regeneration lineage, and advisory drift assessment without choosing angles, cropping, or changing prompts/providers.
- `project-control/GOLDEN_PRODUCT_SET_V1.md` and `project-control/golden-product-set-v1/` are the canonical local evidence corpus. Current readiness is blocked for visual-quality calibration and regression enforcement: 1 draft candidate, 0 approved products, and 0 loafers against the 36/12 target. Pure metadata contracts and durable slot identity may proceed under separate authorization because they do not require visual-quality calibration.
- Gemini-first image generation uses the five-slot contract, reference identity, preview approval, and structured Image QC. Legacy OpenAI prompt/provider code is compatibility code.
- Image generation is available to every product with a valid reference; brand classification is not an image-generation eligibility gate.
- Shopier publish/republish/batch commands use the shared gate and `queueShopierSync()`.
- Lead/order/stock/refund writes use the shared idempotent helpers and transaction boundaries.
- Public links and dispatch require public/eligible products and public HTTPS media where applicable.
- Manual ads are draft/read/report only; no campaigns, pixels, APIs, or spend.

## Documentation Contract

The 20 files in `chatgpt-project-sources` are the compact current-truth pack. Do not exceed 20 documents or append milestone journals. Historical chats, soak scripts, release manifests, ignored sessions/tmp/backups, and exports are evidence or residue, not active instructions. Use `project-control/REPOSITORY_HEALTH_AUDIT_2026-07-26.md` for the latest audit, `project-control/IMAGE_GENERATION_BLUEPRINT_V1.md` for the canonical target image-platform architecture, `project-control/PRODUCT_UNDERSTANDING_LAYER_V1.md` for its canonical pre-prompt product identity layer, `project-control/VISUAL_CONSISTENCY_ENGINE_V1.md` for its canonical five-slot visual-consistency contracts, and `project-control/GOLDEN_PRODUCT_SET_V1.md` for evidence-corpus readiness and review governance.

## Validation

Use focused tests, then `npm run typecheck`, `npm run lint`, `npm run test:safe`, `npm run validate`, and `npm run build` as appropriate.

Required governance references include `test:shopier-commands`, `test:provider-reality`, `test:local-release-candidate`, `test:local-pr-review`, `test:ops-runbook`, `test:runtime-smokes`, `test:source-pack`, `test:image-regeneration-plan`, and `test:image-qc-remediation-plan`.

D-397 local release candidate boundary is local-only; see `project-control/LOCAL_RELEASE_CANDIDATE.md` and `test:local-release-candidate`.

D-398 local PR review package is local-only; see `project-control/LOCAL_PR_REVIEW_PACKAGE.md` and `test:local-pr-review`.

D-403 provider reality audit is local-only; see `project-control/PROVIDER_REALITY_AUDIT.md` and `test:provider-reality`; local env readiness is not production provider readiness.

`test:ad-performance` and `test:openclaw-vps-verification` are standalone, not part of `test:safe`.

## Read-only Runtime Smokes

These commands may read a configured Payload database and require the literal approval flag:

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

## Historical/Optional Material

Historical soak scripts remain quarantined by `project-control/HISTORICAL_SOAK_SCRIPTS.md`. Optional OpenClaw verification lives at `mentix-skills/OPENCLAW_VPS_VERIFICATION.md` and synchronization requires `--reactivate-openclaw` plus `--confirm-vps-sync`.

Do not stage, commit, push, open a PR, deploy, mutate production, call providers, or delete repository/history material unless explicitly requested.
