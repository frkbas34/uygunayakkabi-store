# Current Truth

Verified 2026-07-28 from the checkout, fresh `origin` metadata, local validation, authenticated control-plane checks, passive production verification, the governed catalog cleanup, and the controlled durable-slot production smoke.

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

Authenticated Vercel evidence proves Production, Preview, and Development each have exact `PAYLOAD_DB_PUSH=false` and the shared pooled `DATABASE_URI` uses the restricted replacement runtime role. Production aliases serve READY remote-Git deployment `dpl_EtChj9RhyqpAuy3M7C18BdX24Mnz` at exact durable-runtime commit `e0b60f6c83f6fa6d59dd6647558eca6883acb341`. READY old-runtime deployments `dpl_7Qo8AUvrTcs4RbThdyaG6TGzEiCf` and `dpl_8LtCEGe3ssrwGcf47grCwz3WQWZR` remain rollback candidates. The production Image Slot Lineage schema is `ALL_SEVEN_COLUMNS_PRESENT_COMPATIBLE`; storefront/admin checks and passive logs are healthy.

## Current focus

Telegram-first commerce is the immediate engineering direction. Operator flow, intake, commands, image generation, approvals, publishing, diagnostics, long-running task visibility, summaries, and productivity are evaluated through Telegram first. Image generation is the highest-priority subsystem.

The production runtime now has the Pure Metadata Contracts and Durable Slot Identity V1 foundation. `image-slot-contract/v1` assigns stable semantic IDs to the unchanged five slots, creates one immutable `iga_…` attempt ID per execution, persists one failure-preserving record per requested slot before provider work, associates new generated Media with job/attempt/slot lineage, and projects complete legacy jobs into the existing preview/approval order. Partial legacy records remain readable but are labeled slot-unknown instead of guessed. Provider bytes are wrapped at the orchestration boundary; prompts, cameras, slot purposes/count, provider selection, deterministic transforms, and visual quality behavior were not redesigned.

The controlled production smoke is complete with `CONTROLLED_DURABLE_SLOT_SMOKE_PASS`. The operator used Product 349 / `SN0117` in the authorized private Uygunops DM. Exactly one Job 428 and one immutable attempt produced all five semantic slots on the first try; generated Media 1951-1955 carry exact contract/job/attempt/slot lineage in canonical order. The private five-photo album and keyboard succeeded, the operator rejected the exact preview, Job 428 is terminal `rejected`, the product gallery remains empty, and no second attempt, post-rejection provider activity, publishing, Shopier, activation, or dispatch occurred. The five generated Media remain retained evidence. See `project-control/CONTROLLED_PRODUCTION_DURABLE_SLOT_IDENTITY_SMOKE_V1.md`.

The operator rejected the earlier protected-brand image-generation gate recommendation. Image generation must work for every product with a valid reference input. Brand classification remains relevant to product/authenticity claims, human approval, activation, publishing, advertising, Shopier, and external dispatch, but must never prevent AI image generation.

The production catalog contains 129 products. A complete dependency and first-reference audit classified 30 `KEEP_ACTIVE`, 20 `KEEP_DRAFT`, 5 `IMAGE_TEST_FIXTURE_CANDIDATE`, 12 `QUARANTINE_CANDIDATE`, 0 `HARD_DELETE_CANDIDATE`, and 62 `MANUAL_REVIEW_REQUIRED`. Twelve conclusive noise/empty drafts are now workflow-archived and homepage-hidden while remaining draft; six stale visual states backed only by terminal jobs were corrected from `generating` to `rejected`. The follow-up read-only triage proves all 44 active-like rows are legacy `STALE_PREVIEW` records with no live worker or durable preview-delivery receipt. It classifies 11 of 13 byte-identical reference groups as accidental repeated intake and leaves 2 groups legitimately ambiguous. Job/duplicate evidence reduces the 62-product manual-review recommendation to 25 `KEEP_DRAFT`, 35 `QUARANTINE_CANDIDATE`, and 2 unresolved no-image records. No product, Media, job, order, inquiry, or lineage record was changed or deleted by the triage. The five-product documentation-governed test set is 334/SN0008, 337/SN0011, 349/`BOS-MPVYVL8Q`, 343/SN0017, and 366/SN0037; designation does not authorize generation.

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
- Expansion and credential blockers are superseded by `DURABLE_SLOT_RUNTIME_DEPLOYMENT_PASS`. Production schema remains `ALL_SEVEN_COLUMNS_PRESENT_COMPATIBLE`; exact commit `e0b60f6` is active while both old-runtime rollback deployments remain READY.
- The controlled durable-slot smoke is production-proven for one exact five-slot success-and-rejection path. It does not prove broad visual quality, provider reliability, cost, every failure mode, or repeated-run behavior. Exact next task: `GENERATED MEDIA RETENTION AND RECOVERABLE CLEANUP POLICY V1`.
- The 44 legacy stale previews still block current image deduplication and require exact operator decisions; 43 job/Media sets remain pending decision and one invalid-reference set is retained as failure evidence. Duplicate-product consolidation, Media consolidation, and cleanup remain unauthorized; the two ambiguous groups and two no-image products require operator review.
