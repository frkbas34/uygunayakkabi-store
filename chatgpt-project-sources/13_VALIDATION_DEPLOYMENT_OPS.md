# Validation, Deployment, and Operations

Current as of 2026-07-26. Latest deployed feature boundary: D-501. At the schema-plan preflight, local `main` was the committed foundation `58b2eaf2c035b0c94e7a7ce664f1a3b2f87db177`; `origin/main` remained `d83230224f4068c99c97e5b6c3d08f3e23e49725`, so local was `1/0` ahead/behind. The foundation is unpushed and undeployed; no production schema application was performed.

## Local validation layers

1. Fast static checks: `npm run typecheck`, `npm run lint`.
2. Repository governance and behavior checks: `npm run test:safe`.
3. Full local verification: `npm run validate`.
4. Production-shaped compile: `npm run build`.

The local image correctness suite is `npm run test:image-generation-contracts`. It uses mocks/fixtures only and covers semantic registry invariants, immutable execution IDs, middle-slot provider failure, middle-slot Media-save failure, complete success, legacy compatibility, malformed metadata, safe failure redaction, and prompt/provider/transform/policy stability. It is included in `test:safe` and makes no provider, Telegram, Payload database, Blob, Shopier, publishing, or production call.

The local production build compiles with the additive fields, but its static product read currently falls back because the configured database does not yet contain the new nullable Media-lineage columns. A reviewed schema migration/application is therefore a deployment prerequisite. `project-control/IMAGE_SLOT_LINEAGE_SCHEMA_MIGRATION_PLAN_V1.md`, `scripts/sql/image-slot-lineage-schema-v1.sql`, and the guarded apply helper now define the expansion; none was applied. Docker is unavailable and no safe target is proven, so `NON_PRODUCTION_DATABASE_REQUIRED` remains.

Static schema validation is `npm run test:image-slot-lineage-schema`; SQL review is `npm run db:image-slot-lineage:apply -- --dry-run --print-sql`. The confirmed apply form is reserved for a separately approved, independently verified target. The supported rollout is expand/verify under the old runtime, deploy/verify the new runtime, and roll back runtime first while retaining nullable columns.

Payload schema push currently defaults on if `PAYLOAD_DB_PUSH` is absent. Codex validation, CI, Vercel preview/production, read-only smokes, builds, and controlled migration operations must explicitly set `PAYLOAD_DB_PUSH=false`; automatic runtime/build push is not an approved production migration path.

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
- Schema governance: `npm run test:lead-status-schema`, `npm run test:lead-conversion-schema`, and `npm run test:image-slot-lineage-schema`.
- `project-control/DEPLOY_CHECKLIST.md` as historical reference only; it is not proof of the current deployment.

`project-control/OPENCLAW_VPS_VERIFICATION.md` is not the canonical file. The optional checklist is `mentix-skills/OPENCLAW_VPS_VERIFICATION.md`, verified by `npm run test:openclaw-vps-verification`. OpenClaw synchronization requires both `--reactivate-openclaw` and `--confirm-vps-sync`.

## Provider and Meta boundary

D-495 remains the active Meta safety rule. Before any approved provider test, create a secret-safe Operator Evidence record. Do not print secrets. Do not treat repository tests, local env names, or a successful build as production readiness.

## Explicitly not performed in this audit

No database runtime smoke, live Telegram command, Shopier/provider call, queue write, external dispatch, deployment, commit, push, ad-platform action, SupplierScout activation, retired-channel activation, or OpenClaw synchronization was performed.
