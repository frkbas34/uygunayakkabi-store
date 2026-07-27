# Validation, Deployment, and Operations

Current as of 2026-07-27. Latest deployed feature boundary: D-501. Production serves READY Vercel deployment `dpl_3YCzMcvfLu4jJmTW8caJRncuftxY` on old commit `8adfd1b955baf534da2b20595e6cdd2a407438fe`. Production, Preview, and Development each have exact `PAYLOAD_DB_PUSH=false`. The lineage runtime remains unpushed and undeployed. The reviewed production expansion committed successfully and independently verifies as `ALL_SEVEN_COLUMNS_PRESENT_COMPATIBLE`.

## Local validation layers

1. Fast static checks: `npm run typecheck`, `npm run lint`.
2. Repository governance and behavior checks: `npm run test:safe`.
3. Full local verification: `npm run validate`.
4. Production-shaped compile: `npm run build`.

The local image correctness suite is `npm run test:image-generation-contracts`. It uses mocks/fixtures only and covers semantic registry invariants, immutable execution IDs, middle-slot provider failure, middle-slot Media-save failure, complete success, legacy compatibility, malformed metadata, safe failure redaction, and prompt/provider/transform/policy stability. It is included in `test:safe` and makes no provider, Telegram, Payload database, Blob, Shopier, publishing, or production call.

The local production build compiles with the additive fields. The production database now contains the exact nullable lineage columns, so the schema prerequisite is complete. The old runtime remains active and can omit every new column. Runtime push/deployment is still a separate authorization and is blocked by the credential-handling exception recorded in `project-control/IMAGE_SLOT_LINEAGE_PRODUCTION_EXPANSION_V1.md`.

The 2026-07-26 Attempt 1/2 history is recorded in `project-control/IMAGE_SLOT_LINEAGE_NONPROD_REHEARSAL_V1.md`. Attempt 1 hash `45963EF7…18AC` remains a preserved `REHEARSAL_FAIL`: its embedded `COMMIT` ended the caller-owned rollback transaction. Attempt 2 makes the guarded helper the sole transaction owner and uses corrected hash `06191F19…961E2`. On a fresh strictly CONNECT-isolated local WSL PostgreSQL 18.4 database, rollback, guarded apply, exact schema, legacy preservation, old/new writes, five slot round trips, idempotency, runtime-first rollback, and cleanup all passed. Primary result: `SCHEMA_HARNESS_REHEARSAL_PASS`; `FULL_APPLICATION_COMPATIBILITY_NOT_PROVEN`. Only package-default databases/roles remain after cleanup. No application/production database, provider, Telegram, push, deployment, or production schema was touched.

The corrected evidence set passed `test:image-slot-lineage-schema`, `test:image-slot-lineage-helper`, `test:image-slot-lineage-rehearsal`, the no-connect guarded-helper dry run, `test:image-generation-contracts`, `test:ops-runbook`, `test:source-pack`, the complete `test:safe` chain, typecheck, and lint. No `src/**` file changed.

Static schema validation is `npm run test:image-slot-lineage-schema`; transaction rollback fixture validation is `npm run test:image-slot-lineage-helper`; SQL review is `npm run db:image-slot-lineage:apply -- --dry-run --print-sql`. Confirmed apply requires explicit `IMAGE_SLOT_LINEAGE_DATABASE_URI`, never falls back to `DATABASE_URI`, and remains reserved for a separately approved independently verified target. Manual `psql` requires `--single-transaction`. The supported rollout is expand/verify under the old runtime, deploy/verify the new runtime, and roll back runtime first while retaining nullable columns.

`npm run test:payload-db-push-policy` proves the new local resolver is pure and fail closed before PostgreSQL adapter construction. Missing, empty, and exact `false` disable automatic push; any other non-empty value except exact `true` fails. Exact `true` is allowed only with `NODE_ENV=development` plus `PAYLOAD_DB_PUSH_LOCAL_CONFIRM=ALLOW_LOCAL_SCHEMA_MUTATION`, outside Vercel, CI, production, builds, tests, and read-only operations. Keep explicit `PAYLOAD_DB_PUSH=false` in controlled migration and operational processes; automatic runtime/build push is not an approved production migration path.

Control-plane remediation remains `PRODUCTION_PAYLOAD_SCHEMA_PUSH_CONTROL_PLANE_SAFE`. `project-control/IMAGE_SLOT_LINEAGE_PRODUCTION_EXPANSION_V1.md` records the refreshed rolling PITR marker, exact absent pre-fingerprint, clear writer/lock gate, one 1,307 ms guarded-helper commit, and compatible post-fingerprint `144383bd...e5b1`. The post-DDL transaction read catalog metadata only and rolled back. No application row, Payload initialization, Vercel mutation, push, or runtime deployment occurred.

The target tables remained small by catalog estimate (119 image jobs / 458,752 bytes and 641 Media records / 1,417,216 bytes). The authorized `ACCESS EXCLUSIVE` interval completed without contention under the migration's 5-second lock timeout and 30-second statement timeout; no retry occurred. Exact next task: `DIAGNOSE POST-EXPANSION PRODUCTION HEALTH`. Runtime rollout remains unauthorized until the connection-credential handling exception is separately remediated and the production gate is renewed.

Main pushes create Vercel production-target deployments directly. The `d832302` governance deployment was automatically created and then canceled by the ignored-build step, so GitHub's successful `Canceled by Ignored Build Step` status is not deployment of that commit. The runtime-bearing local chain changes `src/**`/`package.json` and would proceed to a production build if pushed. Production expansion is complete; push, deployment, promotion, and live smoke remain unauthorized.

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

## Explicitly not performed in this audit

No database runtime smoke, live Telegram command, Shopier/provider call, queue write, external dispatch, deployment, commit, push, ad-platform action, SupplierScout activation, retired-channel activation, or OpenClaw synchronization was performed.
