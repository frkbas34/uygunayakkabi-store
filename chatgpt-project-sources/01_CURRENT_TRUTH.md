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

Authenticated Vercel remediation evidence proves Production, Preview, and Development each have exact `PAYLOAD_DB_PUSH=false`. Production aliases serve READY deployment `dpl_3YCzMcvfLu4jJmTW8caJRncuftxY`, still on old commit `8adfd1b955baf534da2b20595e6cdd2a407438fe`. The reviewed Image Slot Lineage expansion has now committed to production while this old runtime stayed active. Independent catalog verification classifies the schema as `ALL_SEVEN_COLUMNS_PRESENT_COMPATIBLE`; narrow storefront/admin checks and passive logs remained healthy.

## Current focus

Telegram-first commerce is the immediate engineering direction. Operator flow, intake, commands, image generation, approvals, publishing, diagnostics, long-running task visibility, summaries, and productivity are evaluated through Telegram first. Image generation is the highest-priority subsystem.

The local runtime now has the Pure Metadata Contracts and Durable Slot Identity V1 foundation. `image-slot-contract/v1` assigns stable semantic IDs to the unchanged five slots, creates one immutable `iga_…` attempt ID per execution, persists one failure-preserving record per requested slot before provider work, associates new generated Media with job/attempt/slot lineage, and projects complete legacy jobs into the existing preview/approval order. Partial legacy records remain readable but are labeled slot-unknown instead of guessed. Provider bytes are wrapped at the orchestration boundary; prompts, cameras, slot purposes/count, provider selection, deterministic transforms, and visual quality behavior were not redesigned.

The operator rejected the earlier protected-brand image-generation gate recommendation. Image generation must work for every product with a valid reference input. Brand classification remains relevant to product/authenticity claims, human approval, activation, publishing, advertising, Shopier, and external dispatch, but must never prevent AI image generation.

## Verified health boundary

The 2026-07-26 audit passed `npm run typecheck`, `npm run lint`, `npm run validate`, `npm run build`, `npm run test:ad-performance`, `npm run test:openclaw-vps-verification`, and `npm run test:shopier-webhook-local`.

Production expansion evidence is recorded in `project-control/IMAGE_SLOT_LINEAGE_PRODUCTION_EXPANSION_V1.md`. Immediately before DDL, the approved fingerprint and `ALL_SEVEN_COLUMNS_ABSENT` classification matched, the writer/lock gate was clear, and the rolling 6-hour PITR marker was current. The guarded helper committed the exact seven-column migration once in 1,307 ms. A separate strict read-only transaction produced post-expansion fingerprint `144383bd...e5b1`, found zero target indexes/FKs and no unrelated column-schema change, and rolled back. No application rows, Git push, or runtime deployment occurred.

## Current blockers

- Telegram webhook verification and empty allowlists can fail open.
- Telegram callback actions are handled before the message-path allowlist checks and need the same fail-closed authorization boundary.
- Rejected, regenerated, and partially approved image jobs leave generated Media records for manual cleanup.
- Attempt/slot identity now has an additive JSON history foundation on the current job, but normalized attempt/slot collections, provider usage/cost/timing, transform/evaluator lineage, checkpoints, cancellation, and long-running progress remain future layers.
- The current job is still reused by regeneration; each execution gets a new immutable attempt record, but a complete normalized attempt-history subsystem and targeted regeneration are not implemented.
- The Telegram route is a 7,820-line monolith with command ownership, callbacks, reads, and mutations in one handler.
- Local environment readiness is not production provider readiness.
- The corrected strict-isolation WSL schema-harness rehearsal passed with SQL hash `06191F19…961E2`; this proves the governed transaction/compatibility harness, not full application or production compatibility. No application or production database was changed.
- Schema-push control-plane remediation remains `PRODUCTION_PAYLOAD_SCHEMA_PUSH_CONTROL_PLANE_SAFE`. One pooled Neon `DATABASE_URI` still spans development, preview, and production scopes; the sharing is now proven and remains an isolation decision for later review.
- Expansion classification: `PRODUCTION_EXPANSION_APPLIED_ROLLOUT_BLOCKED`; production schema classification: `ALL_SEVEN_COLUMNS_PRESENT_COMPATIBLE`. The schema and old runtime passed, but direct connection material appeared once in the private task transcript and was not rotated because rotation was outside the authorization. Runtime rollout remains blocked pending separately authorized credential remediation and renewed production-health approval.
- Exact next task: `DIAGNOSE POST-EXPANSION PRODUCTION HEALTH`. No runtime push or deployment is authorized by the expansion checkpoint.
