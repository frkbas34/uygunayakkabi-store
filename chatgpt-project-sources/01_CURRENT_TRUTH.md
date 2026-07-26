# Current Truth

Verified 2026-07-26 from the checkout, a fresh `origin` fetch, package scripts, local validation, and the operator's subsequent strategic decision.

## Product and scope

UygunAyakkabi is a Telegram-first, AI-assisted commerce system for the operator's own products. Payload is the durable source of truth for products, variants, media, orders, leads, stock, bot events, image-generation jobs, story jobs, Product Intelligence reports, and publishing state.

Active channels:

- Website
- Instagram
- Facebook
- X
- Shopier

Dolap and Threads are retired. SupplierScout is dormant. The protected-brand catalog backlog is deferred; existing activation, storefront, dispatch, Shopier, claims, approval, and ad guards stay enforced and no automatic catalog remediation is authorized.

## Runtime architecture

Next/Payload executes commerce workflows. Telegram is the primary operator workspace. Hermes is the current agent-control layer; Mentix/Uygunops is the Telegram-facing operator identity. OpenClaw is historical/optional unless explicitly reactivated. n8n is optional fallback glue, not the default workflow. Shopier remains the checkout/sales bridge; website-native checkout is deferred.

The deployed integration boundary includes PR #6 (catalog/release hardening through D-500) and PR #7 (D-501 mobile PDP CTA overflow correction). `origin/main` also contains later documentation merge commits. Deployment evidence does not prove current provider credentials, quotas, OAuth permissions, Telegram webhook delivery, or Shopier webhook delivery.

## Current focus

Telegram-first commerce is the immediate engineering direction. Operator flow, intake, commands, image generation, approvals, publishing, diagnostics, long-running task visibility, summaries, and productivity are evaluated through Telegram first. Image generation is the highest-priority subsystem.

The local runtime now has the Pure Metadata Contracts and Durable Slot Identity V1 foundation. `image-slot-contract/v1` assigns stable semantic IDs to the unchanged five slots, creates one immutable `iga_…` attempt ID per execution, persists one failure-preserving record per requested slot before provider work, associates new generated Media with job/attempt/slot lineage, and projects complete legacy jobs into the existing preview/approval order. Partial legacy records remain readable but are labeled slot-unknown instead of guessed. Provider bytes are wrapped at the orchestration boundary; prompts, cameras, slot purposes/count, provider selection, deterministic transforms, and visual quality behavior were not redesigned.

The operator rejected the earlier protected-brand image-generation gate recommendation. Image generation must work for every product with a valid reference input. Brand classification remains relevant to product/authenticity claims, human approval, activation, publishing, advertising, Shopier, and external dispatch, but must never prevent AI image generation.

## Verified health boundary

The 2026-07-26 audit passed `npm run typecheck`, `npm run lint`, `npm run validate`, `npm run build`, `npm run test:ad-performance`, `npm run test:openclaw-vps-verification`, and `npm run test:shopier-webhook-local`.

At the schema-plan preflight, the canonical checkout was clean on local `main` at committed foundation `58b2eaf2c035b0c94e7a7ce664f1a3b2f87db177`; `origin/main` remained `d83230224f4068c99c97e5b6c3d08f3e23e49725`, so local `main` was `1/0` ahead/behind. The retained governance transfer stash, pre-existing stash, and `codex/backup-main-pre-governance-20260726-8a9cfcb` branch were unchanged. The foundation is committed locally but unpushed and undeployed.

## Current blockers

- Telegram webhook verification and empty allowlists can fail open.
- Telegram callback actions are handled before the message-path allowlist checks and need the same fail-closed authorization boundary.
- Rejected, regenerated, and partially approved image jobs leave generated Media records for manual cleanup.
- Attempt/slot identity now has an additive JSON history foundation on the current job, but normalized attempt/slot collections, provider usage/cost/timing, transform/evaluator lineage, checkpoints, cancellation, and long-running progress remain future layers.
- The current job is still reused by regeneration; each execution gets a new immutable attempt record, but a complete normalized attempt-history subsystem and targeted regeneration are not implemented.
- The Telegram route is a 7,820-line monolith with command ownership, callbacks, reads, and mutations in one handler.
- Local environment readiness is not production provider readiness.
- Deployment is blocked pending the reviewed seven-column Image Slot Lineage expansion. The guarded SQL and zero-downtime plan exist locally, but no non-production rehearsal or database apply occurred; `NON_PRODUCTION_DATABASE_REQUIRED`.
- Payload schema push currently defaults on when `PAYLOAD_DB_PUSH` is absent. Codex, CI, Vercel preview/production, read-only smokes, and controlled migrations must explicitly use `PAYLOAD_DB_PUSH=false`; a future fail-closed config change needs separate review.
