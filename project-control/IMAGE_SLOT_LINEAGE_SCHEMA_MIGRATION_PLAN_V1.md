# Image Slot Lineage Schema Migration and Zero-Downtime Rollout Plan V1

Status: `DEPLOYMENT_BLOCKED_PENDING_PRODUCTION_EXPANSION_APPROVAL`

Prepared: 2026-07-26. The corrected artifact has passed a complete disposable local WSL PostgreSQL schema-harness rehearsal. No application/production database migration, deployment, push, provider call, or production Telegram call was performed.

## Current blocker

Commit `58b2eaf2c035b0c94e7a7ce664f1a3b2f87db177` adds durable image-generation attempt/slot metadata to the Payload collection definitions and runtime writes. The configured database was observed during a guarded build to lack the four flattened Media lineage columns. The build's existing read fallback allowed the process to exit successfully; that fallback is not schema or deployment validation.

The new runtime must not be activated against the old schema. The zero-downtime rule is:

`EXPAND SCHEMA FIRST -> VERIFY -> DEPLOY NEW RUNTIME -> VERIFY -> LATER CONTRACT/CLEANUP IF NEEDED`

## Migration-system architecture audit

Transaction-owner decision: `THE GUARDED APPLY PROCESS OWNS THE TRANSACTION`. The SQL file is a transaction body with `SET LOCAL` timeouts and additive DDL only. It contains no `BEGIN`, `COMMIT`, or `ROLLBACK`. The helper verifies the pinned hash, opens one transaction, executes and verifies the exact artifact, commits only on success, and rolls back on failure. Manual `psql` execution must use `--single-transaction` or one approved equivalent wrapper; no second ownership model is supported.

- Superseded Attempt 1 SQL SHA-256: `45963EF7FF50CDB99F3ED95BFE2E1F86D456CA99C95A7A5B325B47D3200518AC`.
- Current corrected SQL SHA-256: `06191F196144259FB1992245B29849AA9353645E2160A03FC13B2F3F654961E2`.
- The hash changed only because transaction controls and ownership comments changed; the same seven nullable, default-free, index-free, FK-free `IF NOT EXISTS` additions remain.

- Runtime: Next.js `16.2.0-canary.81`, Payload `3.79.0`, `@payloadcms/db-postgres` `3.79.0`, Drizzle ORM `0.44.7`, PostgreSQL.
- Payload adapter: `postgresAdapter()` in `payload.config.ts`, using `DATABASE_URI` and conditional Neon TLS configuration.
- Schema push: `push: process.env.PAYLOAD_DB_PUSH !== "false"`. Push therefore defaults to enabled whenever the variable is absent, including development, validation/build, preview, and production processes that load the full Payload config. This is unsafe for controlled production migrations.
- Migration files: there is no Payload migration directory, generated migration manifest, or ordered Payload migration runner in the repository.
- Governed repository convention: reviewed SQL under `scripts/sql/`, dry-run-by-default TypeScript apply helpers requiring an exact confirmation flag, metadata check helpers for older migrations, governance tests, and package scripts. Existing examples include D-355, D-462, D-481, D-489, D-490, and D-491.
- Production migration history: the repository documents guarded manual DDL procedures, but does not prove which files were applied to production or by whom. `OPERATOR_VERIFICATION_REQUIRED`.
- CI: no repository workflow applies this migration. The known GitHub runner is manual and is not evidence of a production migration stage.
- Vercel: `vercel.json` defines the Payload job cron and a build-ignore command only. It contains no pre-activation migration step.
- Main-branch deployment trigger: repository files do not prove whether GitHub/Vercel integration automatically deploys `main`. `OPERATOR_VERIFICATION_REQUIRED`.
- Pre-activation migration capability: no atomic Vercel release hook or promotion workflow is present in the repository. `OPERATOR_VERIFICATION_REQUIRED`.
- Concurrent instances: a serverless deployment can overlap old and new instances, but the exact production topology and overlap window are not proven. `OPERATOR_VERIFICATION_REQUIRED`.

## Exact PostgreSQL delta

The installed Payload/Drizzle adapter provides the mapping evidence:

- collection slugs and field names use snake case;
- a Payload `group` flattens child columns with the group's snake-case prefix;
- scalar Payload `text` maps to PostgreSQL `varchar`;
- Payload `json` maps to PostgreSQL `jsonb`;
- only `required: true` produces `NOT NULL`; none of these fields is required.

| Payload field | Table and column | SQL type | Null | Default | Index | FK | Compatibility |
|---|---|---:|---|---|---|---|---|
| `generationContractVersion` | `image_generation_jobs.generation_contract_version` | `varchar` | Yes | None | No | No | Historical jobs remain null and use the legacy projection. |
| `activeAttemptId` | `image_generation_jobs.active_attempt_id` | `varchar` | Yes | None | No | No | Historical jobs remain null; new executions store immutable `iga_…` IDs. |
| `generationAttempts` | `image_generation_jobs.generation_attempts` | `jsonb` | Yes | None | No | No | Historical jobs remain null; runtime normalization accepts legacy absence. |
| `generationLineage.contractVersion` | `media.generation_lineage_contract_version` | `varchar` | Yes | None | No | No | Existing Media remains valid without lineage. |
| `generationLineage.jobId` | `media.generation_lineage_job_id` | `varchar` | Yes | None | No | No | Text intentionally matches runtime string normalization and is not a Payload relationship. |
| `generationLineage.attemptId` | `media.generation_lineage_attempt_id` | `varchar` | Yes | None | No | No | Existing Media remains null; new generated Media records the attempt. |
| `generationLineage.slotId` | `media.generation_lineage_slot_id` | `varchar` | Yes | None | No | No | Existing Media remains null; current semantic IDs are validated in application code. |

No current query filters or joins on these columns. Indexes would add write cost and migration locking without an evidenced read path, so they are deferred until query measurements justify them. `jobId` is deliberately not a foreign key: it is a text lineage value, historical IDs can vary in representation, and the Payload field is not configured as a relationship. No enum/check constraint is added to `slotId`, allowing versioned contracts to evolve under application validation.

`ADD COLUMN` with no default and no `NOT NULL` avoids a historical-row backfill and table rewrite on supported PostgreSQL versions. PostgreSQL still requires a brief `ACCESS EXCLUSIVE` table lock for each `ALTER TABLE`; the SQL uses a five-second `lock_timeout` and 30-second `statement_timeout` so contention fails the attempt instead of waiting indefinitely.

## Compatibility matrix

| Runtime | Database | Expected result |
|---|---|---|
| Old runtime | Old schema | Current production-compatible behavior; no lineage fields are read or written. |
| Old runtime | Expanded schema | Safe. Nullable unused columns do not change old reads/writes. This is the required overlap state. |
| New runtime | Old schema | Blocked/unsafe. Job metadata updates and generated Media lineage persistence reference missing columns; a build fallback does not protect image-generation writes. |
| New runtime | Expanded schema | Intended behavior. New records gain attempt/slot lineage; historical null records remain readable through explicit legacy compatibility. |

The expansion is additive and backward compatible. There is no contract/removal phase in this task.

## Rollout options

### Option A — migrate before runtime push (recommended)

Apply and verify the nullable expansion while the old runtime is still active, verify old-runtime health, then push/promote the new runtime. This has the smallest compatibility surface, allows immediate runtime rollback, and tolerates old/new instance overlap.

Risk: the DDL needs brief table locks. The bounded lock timeout, no-default columns, quiet-window execution, and retry only after diagnosis limit this risk.

### Option B — feature-flagged writes

Deploy new code with lineage writes off, expand the schema, then enable writes. This can stage runtime and schema independently, but the current code has no such flag. Implementing one adds a second compatibility mode, more tests, configuration drift, and another operator action. The additive expand-first migration already makes old/new overlap safe. A feature flag is not justified now and was not implemented.

### Option C — deployment-pipeline migration

Run reviewed DDL as a controlled step before runtime activation. This can be robust in a pipeline with target identity checks, backup gates, one migration leader, and atomic promotion. The current repository has no migration manifest, CI migration job, or proven Vercel pre-activation hook. It is therefore not reliable without a separately designed release pipeline. `OPERATOR_VERIFICATION_REQUIRED` before reconsidering.

## Migration artifact and application boundary

Artifacts:

- `scripts/sql/image-slot-lineage-schema-v1.sql`
- `scripts/image-slot-lineage-schema-apply.ts`
- `scripts/image-slot-lineage-schema-governance.ts`
- `scripts/image-slot-lineage-schema-apply.test.ts`

Static review/dry run:

```powershell
npm run test:image-slot-lineage-schema
npm run db:image-slot-lineage:apply -- --dry-run --print-sql
```

The dry run verifies the current SQL hash but does not load environment files, open a database connection, or execute DDL. The following apply form is documented for a later, separately approved operation only. `IMAGE_SLOT_LINEAGE_DATABASE_URI` must be provided explicitly by the approved operation; the helper never falls back to `DATABASE_URI`, rejects the same host/port/database identity when `DATABASE_URI` is present, and redacts URI-shaped errors.

```powershell
npm run db:image-slot-lineage:apply -- --apply --confirm-apply-image-slot-lineage-schema-v1
```

The helper blocks missing base tables and incompatible pre-existing columns, then begins one transaction, executes the exact hash-pinned SQL body, verifies all seven types/nullability/defaults inside that transaction, and commits only after success. Any statement or verification failure triggers rollback. It cannot prove provider/account target identity or backup completion; those remain operator gates.

Manual `psql` use must make transaction ownership explicit:

```powershell
$env:PGPASSFILE = '<protected-approved-secret-file>'
psql --single-transaction --set ON_ERROR_STOP=1 --file scripts/sql/image-slot-lineage-schema-v1.sql --host <approved-host> --port <approved-port> --username <approved-role> --dbname <approved-database>
```

Never pass the application `DATABASE_URI` to this command.

There is no migration manifest/order validator in the current repository. This artifact must be recorded in the operator's deployment evidence as the schema prerequisite for commit `58b2eaf`. No down SQL is supplied because the safe supported rollback is runtime-first and non-destructive. Column removal, if ever useful, is a later contract migration requiring separate approval and dependency evidence.

## Non-production validation

Result: `SCHEMA_HARNESS_REHEARSAL_PASS`.

Attempt 1 with hash `45963…18AC` failed because the SQL artifact's embedded `COMMIT` ended the caller-owned rollback transaction. That failure and successful cleanup remain preserved in `project-control/IMAGE_SLOT_LINEAGE_NONPROD_REHEARSAL_V1.md`.

Attempt 2 used PostgreSQL 18.4 in Ubuntu WSL on loopback/socket only. A fresh database revoked PUBLIC CONNECT and allowed only its non-superuser owner plus `postgres`. The corrected caller-owned rollback drill restored the exact baseline; the guarded helper applied and verified the expansion; old-shape and new-lineage operations, all five semantic slots, idempotency, and runtime-first rollback passed; cleanup restored the default-only cluster and unchanged ACLs on other databases.

This is schema-harness evidence only. `FULL_APPLICATION_COMPATIBILITY_NOT_PROVEN` remains, and no application/production database was accessed.

## Automatic schema-push policy

Current default-on behavior is a material risk because a normal process can mutate schema merely by loading Payload. The minimal policy is:

| Context | Required setting/policy |
|---|---|
| Local development | `PAYLOAD_DB_PUSH=false` by default; temporary push requires explicit developer intent and a disposable local DB. |
| Codex validation | Always `PAYLOAD_DB_PUSH=false`. |
| CI | Always `PAYLOAD_DB_PUSH=false`; CI may statically validate migrations but must not mutate shared DBs. |
| Vercel preview | Explicitly configure `PAYLOAD_DB_PUSH=false`. Use a separate preview DB and guarded migration only when approved. |
| Vercel production | Explicitly configure `PAYLOAD_DB_PUSH=false`; runtime/build startup must not be the migration mechanism. |
| Read-only runtime smokes | Set `PAYLOAD_DB_PUSH=false` before Payload import, as existing guarded smokes do. |
| Migration operation | Keep Payload auto-push off; run only the reviewed guarded SQL with explicit confirmation. |

No runtime configuration was changed in this task. A future fail-closed configuration change should make push explicit opt-in rather than default-on, but it must be a separately identifiable and reviewed safety change. Until then, environment verification is a hard deployment gate.

## Backup, fingerprint, and rollback

Before migration:

1. Identify the database by provider project/account/branch ID and endpoint fingerprint without exposing credentials.
2. Create a provider-native snapshot, branch, or point-in-time recovery marker immediately before DDL.
3. Wait for the provider to report completion and record timestamp, immutable snapshot/branch ID, retention window, and operator identity.
4. Capture the current runtime commit and deployment ID.
5. Export normalized metadata for both tables from `information_schema.columns` (table, ordinal position, column, data type, UDT, nullable, default) and hash the redacted output with SHA-256.
6. Confirm there is no active migration and that image-generation traffic can tolerate a brief retry if the lock timeout fires.

After migration, capture the same metadata and SHA-256 fingerprint, retain the guarded helper output, and verify that the only delta is the seven expected columns.

Rollback decision triggers include DDL verification failure, unexpected schema delta, old-runtime read/write regression, sustained lock contention, new deployment image metadata failures, or material error-rate growth. During an incident:

1. Stop promotion or roll the application back to the previously verified runtime.
2. Keep `PAYLOAD_DB_PUSH=false`.
3. Leave the nullable columns in place; the old runtime ignores them.
4. Confirm old-runtime application, queue, and database health.
5. Restore from snapshot only for demonstrated data/schema corruption that cannot be repaired safely; additive columns alone are not a reason to restore.
6. Do not drop columns during the incident. Any later removal is a separate reviewed contract migration.

## Exact operator-controlled deployment sequence

None of these production steps is authorized by this document alone.

1. Verify the canonical repository, clean release worktree, reviewed commit, origin state, and absence of an active Git operation.
2. Verify and record the currently running production commit/deployment ID. `OPERATOR_VERIFICATION_REQUIRED`.
3. Verify whether pushing `main` auto-deploys and whether deployments can be promoted manually. `OPERATOR_VERIFICATION_REQUIRED`.
4. Identify and independently confirm the production database target; never infer environment from a database name.
5. Verify `PAYLOAD_DB_PUSH=false` in build, preview, and production environments without printing secrets. Block release if absent.
6. Create and confirm a current provider-native snapshot/PITR marker; record secret-safe evidence.
7. Capture pre-migration table metadata and its normalized SHA-256 fingerprint.
8. In a quiet window, run the reviewed guarded apply command once from an approved operator environment. If the lock timeout or compatibility preflight fails, stop and diagnose; do not improvise DDL.
9. Capture post-migration metadata/fingerprint and prove the exact seven-column delta.
10. While the old runtime remains active, verify narrow application health and old image-job/Media reads. Do not call an image provider.
11. Only after steps 1-10 pass, push or manually promote commit `58b2eaf2c035b0c94e7a7ce664f1a3b2f87db177` under separate authorization.
12. Verify the build ran with `PAYLOAD_DB_PUSH=false`, the intended deployment became active, and old/new overlap produced no schema errors.
13. Run narrowly scoped read-only schema verification against the approved target, then verify historical jobs and Media remain readable.
14. Only with explicit provider-spend and Telegram approval, run one targeted image metadata smoke; verify job contract version, active attempt, attempt ledger, and each persisted Media lineage tuple without publishing or dispatch.
15. Monitor database errors, job failures, Media persistence errors, Telegram approval behavior, latency, and lock/connection signals through the agreed observation window.
16. Record commit, deployment ID, migration SQL hash, pre/post schema fingerprints, snapshot ID, verification results, timestamps, and operator approvals.
17. If a rollback trigger fires, roll back runtime first and retain the additive columns; restore the database only for independently proven corruption.

## Operator approval gates

Explicit operator approval is required for each of the following: selecting a non-production target, applying the migration in rehearsal, selecting production, creating/validating the backup, applying production DDL, pushing `main`, promoting/deploying, running a production read-only schema check, making a provider call, running Telegram production smoke, and any later cleanup migration.

## Post-deployment verification

- local and deployed commit match the approved release;
- build/runtime environments report schema push disabled without revealing values;
- all seven columns match the documented types, are nullable, and have no defaults;
- historical image jobs and Media read successfully with null lineage;
- a separately approved new run produces one immutable attempt ID and non-compacted semantic slot results;
- generated Media lineage matches job ID, attempt ID, contract version, and semantic slot ID;
- Telegram preview/approval preserves slot identity;
- no prompt, camera, slot-purpose/count, provider, image-quality, protected-brand generation eligibility, publishing, or dispatch behavior changed;
- no unexpected schema delta, backfill, index, constraint, or data loss occurred.

## Unresolved decisions and remaining risks

- A reusable local-only WSL schema harness is proven; a production target still requires independent provider/account identity and backup evidence.
- Current production database identity, backup/PITR capability, connection role, and maintenance procedure require operator verification.
- GitHub/Vercel automatic deployment, promotion behavior, build environment values, and concurrent-instance behavior require operator verification.
- Default-on Payload schema push remains a configuration footgun until a separately reviewed fail-closed change is made.
- `ALTER TABLE` still requires brief locks; the disposable harness proved bounded behavior but not production table size, traffic, or contention.
- The repository lacks a first-class ordered migration manifest and automated pre-activation runner.
- A build success against a stale database remains non-evidence because existing application fallbacks can hide read errors.

## Release decision and next task

Commits `58b2eaf2c035b0c94e7a7ce664f1a3b2f87db177` and `b806c7706b6f679de0cc1522f37b71e902b7d58f` are technically schema-harness rehearsed against the corrected artifact, but must **not** be pushed yet. A push may trigger an unproven automatic deployment; no application/production expansion, backup, or deployment approval exists; and automatic Payload schema push still defaults on.

Exact next task: **CHECKPOINT CORRECTED LINEAGE MIGRATION AND REHEARSAL EVIDENCE** — review and commit only the corrected governed SQL/helper/tests, reusable harness artifacts, Attempt 1/2 evidence, and synchronized current-truth documentation. Do not push, deploy, or apply production schema in that checkpoint task.
