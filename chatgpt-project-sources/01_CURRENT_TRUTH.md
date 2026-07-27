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

Authenticated Vercel remediation evidence proves Production, Preview, and Development each have exact `PAYLOAD_DB_PUSH=false` and one shared pooled `DATABASE_URI` record now uses a restricted replacement runtime role. Production aliases serve READY deployment `dpl_7Qo8AUvrTcs4RbThdyaG6TGzEiCf`; READY deployment `dpl_8LtCEGe3ssrwGcf47grCwz3WQWZR` is the replacement-credential rollback candidate. Both are Vercel Redeploy results from unchanged old commit `8adfd1b955baf534da2b20595e6cdd2a407438fe`, not local workspace deployments. The reviewed Image Slot Lineage expansion is `ALL_SEVEN_COLUMNS_PRESENT_COMPATIBLE`; storefront/admin checks and passive logs remain healthy.

## Current focus

Telegram-first commerce is the immediate engineering direction. Operator flow, intake, commands, image generation, approvals, publishing, diagnostics, long-running task visibility, summaries, and productivity are evaluated through Telegram first. Image generation is the highest-priority subsystem.

The local runtime now has the Pure Metadata Contracts and Durable Slot Identity V1 foundation. `image-slot-contract/v1` assigns stable semantic IDs to the unchanged five slots, creates one immutable `iga_…` attempt ID per execution, persists one failure-preserving record per requested slot before provider work, associates new generated Media with job/attempt/slot lineage, and projects complete legacy jobs into the existing preview/approval order. Partial legacy records remain readable but are labeled slot-unknown instead of guessed. Provider bytes are wrapped at the orchestration boundary; prompts, cameras, slot purposes/count, provider selection, deterministic transforms, and visual quality behavior were not redesigned.

The operator rejected the earlier protected-brand image-generation gate recommendation. Image generation must work for every product with a valid reference input. Brand classification remains relevant to product/authenticity claims, human approval, activation, publishing, advertising, Shopier, and external dispatch, but must never prevent AI image generation.

## Verified health boundary

The 2026-07-26 audit passed `npm run typecheck`, `npm run lint`, `npm run validate`, `npm run build`, `npm run test:ad-performance`, `npm run test:openclaw-vps-verification`, and `npm run test:shopier-webhook-local`.

Production expansion evidence is recorded in `project-control/IMAGE_SLOT_LINEAGE_PRODUCTION_EXPANSION_V1.md`. Immediately before DDL, the approved fingerprint and `ALL_SEVEN_COLUMNS_ABSENT` classification matched, the writer/lock gate was clear, and the rolling 6-hour PITR marker was current. The guarded helper committed the exact seven-column migration once in 1,307 ms. A separate strict read-only transaction produced post-expansion fingerprint `144383bd...e5b1`, found zero target indexes/FKs and no unrelated column-schema change, and rolled back. No application rows, Git push, or runtime deployment occurred.

Credential replacement evidence is recorded in `project-control/NEON_CREDENTIAL_REPLACEMENT_V1.md`. The transcript value was a stale migration/control-plane credential for the same retained owner role, not the active Vercel password. A new non-superuser runtime login has explicit public-schema DML/sequence access, no managed-role membership, no elevated role attributes, and no ownership. Only Vercel `DATABASE_URI` changed across Production, Preview, and Development; unrelated environment metadata was unchanged. Neon’s managed owner cannot be set `NOLOGIN`, so its password was reset and discarded through the signed-in control plane. The exposed and former active owner credentials now fail with `28P01`; replacement direct/pooled access and both unchanged-runtime deployments remain healthy.

## Current blockers

- Telegram webhook verification and empty allowlists can fail open.
- Telegram callback actions are handled before the message-path allowlist checks and need the same fail-closed authorization boundary.
- Rejected, regenerated, and partially approved image jobs leave generated Media records for manual cleanup.
- Attempt/slot identity now has an additive JSON history foundation on the current job, but normalized attempt/slot collections, provider usage/cost/timing, transform/evaluator lineage, checkpoints, cancellation, and long-running progress remain future layers.
- The current job is still reused by regeneration; each execution gets a new immutable attempt record, but a complete normalized attempt-history subsystem and targeted regeneration are not implemented.
- The Telegram route is a 7,820-line monolith with command ownership, callbacks, reads, and mutations in one handler.
- Local environment readiness is not production provider readiness.
- The corrected strict-isolation WSL schema-harness rehearsal passed with SQL hash `06191F19…961E2`; this proves the governed transaction/compatibility harness, not full application or production compatibility. No application or production database was changed.
- Schema-push control-plane remediation remains `PRODUCTION_PAYLOAD_SCHEMA_PUSH_CONTROL_PLANE_SAFE`. One pooled Neon `DATABASE_URI` still spans development, preview, and production scopes; it now uses the restricted replacement runtime role. The sharing remains an isolation decision for later review.
- Expansion classification: `PRODUCTION_EXPANSION_APPLIED_ROLLOUT_BLOCKED` is superseded by `NEON_CREDENTIAL_REPLACEMENT_PASS`. Production schema remains `ALL_SEVEN_COLUMNS_PRESENT_COMPATIBLE`; the credential exception is closed and unchanged-old-runtime health is renewed.
- Exact next task: `PUSH AND DEPLOY DURABLE IMAGE SLOT IDENTITY RUNTIME V1`. The durable runtime is still unpushed and undeployed and needs its own explicit push/deployment authorization.
