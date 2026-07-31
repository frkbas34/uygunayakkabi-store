# Validation, Deployment, and Operations

Current as of 2026-07-29. Latest deployed feature boundary: D-501. Latest deployed governance boundary: `200f27c11fd4a92c15e465f3469bb3c7b57a0014`. Production serves READY remote-Git deployment `dpl_95PnR3aSTtMbbk7oEU5GsYTMJNZE`; durable-slot runtime behavior was introduced at `e0b60f6c83f6fa6d59dd6647558eca6883acb341`. READY old-runtime deployments `dpl_7Qo8AUvrTcs4RbThdyaG6TGzEiCf` and `dpl_8LtCEGe3ssrwGcf47grCwz3WQWZR` remain rollback candidates. Production, Preview, and Development each have exact `PAYLOAD_DB_PUSH=false` and the restricted replacement pooled database credential. The production schema independently verifies as `ALL_SEVEN_COLUMNS_PRESENT_COMPATIBLE`.

## Local validation layers

1. Fast static checks: `npm run typecheck`, `npm run lint`.
2. Repository governance and behavior checks: `npm run test:safe`.
3. Full local verification: `npm run validate`.
4. Production-shaped compile: `npm run build`.

The local image correctness suite is `npm run test:image-generation-contracts`. It uses mocks/fixtures only and covers semantic registry invariants, immutable execution IDs, middle-slot provider failure, middle-slot Media-save failure, complete success, legacy compatibility, malformed metadata, safe failure redaction, and prompt/provider/transform/policy stability. It is included in `test:safe` and makes no provider, Telegram, Payload database, Blob, Shopier, publishing, or production call.

Generated Media retention validation is `npm run test:generated-media-retention-policy` plus `npm run test:generated-media-retention-dry-run`; both are in `test:safe`. The first covers 30 deterministic fail-closed scenarios and proves no classifier path can authorize physical deletion. The second proves the reporter requires `PAYLOAD_DB_PUSH=false`, an explicit read-only confirmation, a verified read-only transaction, fixed SELECT-only access, rollback, and no Payload/Blob/Telegram/provider client. An authorized production census is `PAYLOAD_DB_PUSH=false npm run dryrun:generated-media-retention -- --confirm-read-only`; it is never part of `test:safe` and must not be run without an approved target.

Recoverable-quarantine validation is `npm run test:generated-media-quarantine`: 56 pure contract tests plus static governance. It covers all required raw contradiction signals and precedence, explicit unknown/missing failure, fingerprint V1/V2 separation, material evidence hash changes, manifest V2 and expiry, immutable ordering, no legacy lineage inference, proposal/authorization separation, revalidation and restore failures, additive persistence defaults, complete reporter mapping, SELECT-only transaction governance, and rollback. It is included in `pretest:safe`. `npm run dryrun:generated-media-quarantine-proposal -- --confirm-read-only` is separately authorized production read-only work and is never part of `test:safe`; no new production census was run for the contradiction patch. The 2026-07-29 refresh remains the latest evidence.

The production build compiled with the additive fields and the production database contains the exact nullable lineage columns. `project-control/NEON_CREDENTIAL_REPLACEMENT_V1.md` closes the credential-handling exception with replacement direct/pooled proof and old-credential rejection evidence. `project-control/DURABLE_IMAGE_SLOT_IDENTITY_RUNTIME_DEPLOYMENT_V1.md` records the fast-forward push, exact Git-source build, production alias transition, passive health, unchanged read-only schema fingerprint, and `DURABLE_SLOT_RUNTIME_DEPLOYMENT_PASS`.

`project-control/CONTROLLED_PRODUCTION_DURABLE_SLOT_IDENTITY_SMOKE_V1.md` records the authorized production runtime proof. The private Uygunops command created exactly one Job 428 and one immutable attempt, all five semantic slots and Media lineage passed, private album/keyboard delivery succeeded, and exact manual rejection reconciled the job to terminal `rejected`. Post-rejection checks found zero active/preview Product 349 jobs, second attempts, provider activity, gallery attachment, Shopier/publishing/dispatch actions, schema errors, DDL, or HTTP 5xx. `/`, `/yardim`, and `/admin` returned HTTP 200. The five generated Media remain controlled evidence. Result: `CONTROLLED_DURABLE_SLOT_SMOKE_PASS`.

The 2026-07-26 Attempt 1/2 history is recorded in `project-control/IMAGE_SLOT_LINEAGE_NONPROD_REHEARSAL_V1.md`. Attempt 1 hash `45963EF7…18AC` remains a preserved `REHEARSAL_FAIL`: its embedded `COMMIT` ended the caller-owned rollback transaction. Attempt 2 makes the guarded helper the sole transaction owner and uses corrected hash `06191F19…961E2`. On a fresh strictly CONNECT-isolated local WSL PostgreSQL 18.4 database, rollback, guarded apply, exact schema, legacy preservation, old/new writes, five slot round trips, idempotency, runtime-first rollback, and cleanup all passed. Primary result: `SCHEMA_HARNESS_REHEARSAL_PASS`; `FULL_APPLICATION_COMPATIBILITY_NOT_PROVEN`. Only package-default databases/roles remain after cleanup. No application/production database, provider, Telegram, push, deployment, or production schema was touched.

The corrected evidence set passed `test:image-slot-lineage-schema`, `test:image-slot-lineage-helper`, `test:image-slot-lineage-rehearsal`, the no-connect guarded-helper dry run, `test:image-generation-contracts`, `test:ops-runbook`, `test:source-pack`, the complete `test:safe` chain, typecheck, and lint. No `src/**` file changed.

Static schema validation is `npm run test:image-slot-lineage-schema`; transaction rollback fixture validation is `npm run test:image-slot-lineage-helper`; SQL review is `npm run db:image-slot-lineage:apply -- --dry-run --print-sql`. Confirmed apply requires explicit `IMAGE_SLOT_LINEAGE_DATABASE_URI`, never falls back to `DATABASE_URI`, and remains reserved for a separately approved independently verified target. Manual `psql` requires `--single-transaction`. The supported rollout is expand/verify under the old runtime, deploy/verify the new runtime, and roll back runtime first while retaining nullable columns.

`npm run test:payload-db-push-policy` proves the new local resolver is pure and fail closed before PostgreSQL adapter construction. Missing, empty, and exact `false` disable automatic push; any other non-empty value except exact `true` fails. Exact `true` is allowed only with `NODE_ENV=development` plus `PAYLOAD_DB_PUSH_LOCAL_CONFIRM=ALLOW_LOCAL_SCHEMA_MUTATION`, outside Vercel, CI, production, builds, tests, and read-only operations. Keep explicit `PAYLOAD_DB_PUSH=false` in controlled migration and operational processes; automatic runtime/build push is not an approved production migration path.

Control-plane remediation remains `PRODUCTION_PAYLOAD_SCHEMA_PUSH_CONTROL_PLANE_SAFE`. `project-control/IMAGE_SLOT_LINEAGE_PRODUCTION_EXPANSION_V1.md` records the refreshed rolling PITR marker, exact absent pre-fingerprint, clear writer/lock gate, one 1,307 ms guarded-helper commit, and compatible post-fingerprint `144383bd...e5b1`. The post-DDL transaction read catalog metadata only and rolled back. No application row, Payload initialization, Vercel mutation, push, or runtime deployment occurred.

Credential replacement is `NEON_CREDENTIAL_REPLACEMENT_PASS`. `project-control/NEON_CREDENTIAL_REPLACEMENT_V1.md` records the one-way credential/target fingerprints, least-privilege runtime role, sole `DATABASE_URI` change across all three scopes, unchanged unrelated-environment metadata hash, first/second Redeploy IDs, alias transition, clean health/log checks, supported Neon owner-password reset, `28P01` rejection of exposed and former active owner credentials, continued replacement access, and secret cleanup. Neon’s managed owner remains LOGIN-capable because the platform rejects `NOLOGIN`; its reset password was discarded and is not referenced by Vercel.

The target tables remained small by catalog estimate (119 image jobs / 458,752 bytes and 641 Media records / 1,417,216 bytes). The authorized `ACCESS EXCLUSIVE` interval completed without contention under the migration's 5-second lock timeout and 30-second statement timeout; no retry occurred. The later controlled smoke and refreshed read-only retention/quarantine census passed; exact next task is `GENERATED MEDIA QUARANTINE SCHEMA MIGRATION AND NON-PRODUCTION REHEARSAL V1`. The durable-runtime deployment itself did not execute a provider, Telegram command, image generation, or application-data mutation.

Main pushes create Vercel production-target deployments directly. The ignored-build script compares the previous deployed SHA with the pushed SHA; the nine-commit runtime chain therefore built normally even though its HEAD commit was documentation-oriented. Deployment `dpl_EtChj9RhyqpAuy3M7C18BdX24Mnz` is proven remote Git source at exact commit `e0b60f6`; no local workspace upload, ignored-build fallback, or separate promotion was used. The controlled live smoke was separately authorized and completed without another deployment.

The 2026-07-26 audit passed typecheck, lint, validate, build, `test:ad-performance`, `test:openclaw-vps-verification`, and `test:shopier-webhook-local`. The build used the SiteSettings fallback; this is not proof of production configuration health.

`test:safe` includes runtime-smoke governance assertions through `test:runtime-smokes`, but it never executes a runtime smoke. `test:ad-performance` is currently a standalone check and is not in `test:safe`; documentation must not claim otherwise.

## Read-only runtime smokes

These commands may connect to real Payload data. Run only with an approved target and the literal confirmation flag shown here:

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

The operator plan uses load-plan-selected product-flow runtime and Telegram checks before any queueing decision. Use `/smokeplan` for the ordered operator checklist.

## Guardrail references

- Runtime smoke rules: `project-control/RUNTIME_SMOKE_CHECKS.md`; governance: `npm run test:runtime-smokes`.
- Deployment operations: `project-control/DEPLOYMENT_OPS_RUNBOOK.md` and `project-control/OPERATOR_RUNBOOK.md`; governance: `npm run test:ops-runbook`.
- Local release evidence: `project-control/LOCAL_RELEASE_CANDIDATE.md`; governance: `npm run test:local-release-candidate`.
- Local PR review evidence: `project-control/LOCAL_PR_REVIEW_PACKAGE.md`; governance: `npm run test:local-pr-review`.
- Provider evidence: `project-control/PROVIDER_REALITY_AUDIT.md`; governance: `npm run test:provider-reality`. Local env readiness is not production provider readiness.
- Historical soak quarantine: `project-control/HISTORICAL_SOAK_SCRIPTS.md`; governance uses historical soak-script governance assertions in `npm run test:soak-scripts`.
- Shopier command gate: `npm run test:shopier-commands`.
- Product diagnostics: `npm run test:product-flow-snapshot`, `npm run test:image-regeneration-plan`, and `npm run test:image-qc-remediation-plan`.
- Schema governance: `npm run test:payload-db-push-policy`, `npm run test:lead-status-schema`, `npm run test:lead-conversion-schema`, and `npm run test:image-slot-lineage-schema`.
- `project-control/DEPLOY_CHECKLIST.md` as historical reference only; it is not proof of the current deployment.

`project-control/OPENCLAW_VPS_VERIFICATION.md` is not the canonical file. The optional checklist is `mentix-skills/OPENCLAW_VPS_VERIFICATION.md`, verified by `npm run test:openclaw-vps-verification`. OpenClaw synchronization requires both `--reactivate-openclaw` and `--confirm-vps-sync`.

## Provider and Meta boundary

D-495 remains the active Meta safety rule. Before any approved provider test, create a secret-safe Operator Evidence record. Do not print secrets. Do not treat repository tests, local env names, or a successful build as production readiness.

## Explicitly not performed in the durable-runtime deployment

No database runtime smoke, live Telegram command, Shopier/provider call, queue write, external dispatch, ad-platform action, image generation, Media upload, application-data read/write, SupplierScout activation, retired-channel activation, or OpenClaw synchronization was performed. The authorized Git push, Git-sourced Vercel deployment, passive HTTP/log checks, catalog-only read-only schema transactions, and local evidence commit are the only external/runtime actions in this checkpoint.
