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

Authenticated Vercel evidence proves the current production aliases still serve commit `8adfd1b955baf534da2b20595e6cdd2a407438fe` through READY deployment `dpl_517iJaUxzSifu7F6jJgHoo12B1kv`. A push to `main` creates a production-target deployment directly; the `d832302` governance deployment was created automatically but canceled by the repository's ignored-build step, so it did not replace the serving runtime. Deployment evidence does not prove current provider credentials, quotas, OAuth permissions, Telegram webhook delivery, or Shopier webhook delivery.

## Current focus

Telegram-first commerce is the immediate engineering direction. Operator flow, intake, commands, image generation, approvals, publishing, diagnostics, long-running task visibility, summaries, and productivity are evaluated through Telegram first. Image generation is the highest-priority subsystem.

The local runtime now has the Pure Metadata Contracts and Durable Slot Identity V1 foundation. `image-slot-contract/v1` assigns stable semantic IDs to the unchanged five slots, creates one immutable `iga_…` attempt ID per execution, persists one failure-preserving record per requested slot before provider work, associates new generated Media with job/attempt/slot lineage, and projects complete legacy jobs into the existing preview/approval order. Partial legacy records remain readable but are labeled slot-unknown instead of guessed. Provider bytes are wrapped at the orchestration boundary; prompts, cameras, slot purposes/count, provider selection, deterministic transforms, and visual quality behavior were not redesigned.

The operator rejected the earlier protected-brand image-generation gate recommendation. Image generation must work for every product with a valid reference input. Brand classification remains relevant to product/authenticity claims, human approval, activation, publishing, advertising, Shopier, and external dispatch, but must never prevent AI image generation.

## Verified health boundary

The 2026-07-26 audit passed `npm run typecheck`, `npm run lint`, `npm run validate`, `npm run build`, `npm run test:ad-performance`, `npm run test:openclaw-vps-verification`, and `npm run test:shopier-webhook-local`.

At the production-expansion pre-flight, the canonical checkout was clean on local `main` at `832f972c14ae29a14be083dac1cf89ba23238406`; `origin/main` remained `d83230224f4068c99c97e5b6c3d08f3e23e49725`, so local `main` was `3/0` ahead/behind. The exact outgoing chain is durable runtime foundation `58b2eaf`, governed migration plan `b806c77`, and corrected transaction/rehearsal evidence `832f972`. The retained governance transfer stash, pre-existing stash, and `codex/backup-main-pre-governance-20260726-8a9cfcb` branch were unchanged. All three commits remain unpushed and undeployed.

## Current blockers

- Telegram webhook verification and empty allowlists can fail open.
- Telegram callback actions are handled before the message-path allowlist checks and need the same fail-closed authorization boundary.
- Rejected, regenerated, and partially approved image jobs leave generated Media records for manual cleanup.
- Attempt/slot identity now has an additive JSON history foundation on the current job, but normalized attempt/slot collections, provider usage/cost/timing, transform/evaluator lineage, checkpoints, cancellation, and long-running progress remain future layers.
- The current job is still reused by regeneration; each execution gets a new immutable attempt record, but a complete normalized attempt-history subsystem and targeted regeneration are not implemented.
- The Telegram route is a 7,820-line monolith with command ownership, callbacks, reads, and mutations in one handler.
- Local environment readiness is not production provider readiness.
- The corrected strict-isolation WSL schema-harness rehearsal passed with SQL hash `06191F19…961E2`; this proves the governed transaction/compatibility harness, not full application or production compatibility. No application or production database was changed.
- Production pre-flight result: `PRODUCTION_PREFLIGHT_FAIL_SCHEMA_PUSH_UNSAFE`. Authenticated Vercel metadata proves `PAYLOAD_DB_PUSH` is absent in preview and production, while Payload interprets absence as true. One pooled Neon `DATABASE_URI` in `eu-central-1` is shared across development, preview, and production scopes. The production Neon project/branch, PostgreSQL major version, backup/PITR state, dedicated read-only metadata role, and seven-column fingerprint remain unproven.
- Exact next task: `MAKE PAYLOAD SCHEMA PUSH FAIL CLOSED V1`. Production expansion, push, and deployment remain unauthorized.
