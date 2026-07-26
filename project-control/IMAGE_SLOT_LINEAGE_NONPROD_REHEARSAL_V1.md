# Image Slot Lineage Non-Production Rehearsal V1

Primary classification: `SCHEMA_HARNESS_REHEARSAL_PASS`

Evidence updated: 2026-07-26 18:28 +03:00 (`Turkey Standard Time`). This report contains no credential, complete URI, production data, customer data, Telegram identifier, provider payload, external URL, or provider resource identifier. Attempt 1 and its earlier blocked-discovery record remain preserved below as historical evidence.

## Attempt 2 — corrected single-owner rehearsal

### Transaction-owner decision and artifact reconciliation

Canonical decision: `THE GUARDED APPLY PROCESS OWNS THE TRANSACTION`.

The SQL artifact is now a transaction body only: it contains the same two `SET LOCAL` timeout statements and the semantically identical seven `ADD COLUMN IF NOT EXISTS` operations, with no `BEGIN`, `COMMIT`, or `ROLLBACK`. The helper verifies the exact SQL hash before any apply, opens one transaction, executes the artifact, verifies all seven columns inside that transaction, commits only after success, rolls back on any error, and closes the client in `finally`. Manual `psql` use requires `--single-transaction` or an approved single-owner wrapper.

- Attempt 1 superseded SQL SHA-256: `45963EF7FF50CDB99F3ED95BFE2E1F86D456CA99C95A7A5B325B47D3200518AC`
- Attempt 2 current SQL SHA-256: `06191F196144259FB1992245B29849AA9353645E2160A03FC13B2F3F654961E2`
- Defect category: `TRANSACTION_OWNERSHIP_CONFLICT`; the column definitions were not defective.
- Dedicated apply variable: `IMAGE_SLOT_LINEAGE_DATABASE_URI`. The helper does not load env files, cannot fall back to `DATABASE_URI`, rejects a target resolving to the configured application database, and redacts URI-shaped errors.
- Deterministic helper fixture proved success order `BEGIN → SQL → VERIFY → COMMIT` and deliberate statement-failure order `BEGIN → failing SQL → ROLLBACK`, with no commit on failure.

### WSL and strict isolation

- Ubuntu 26.04 LTS on WSL 2; PostgreSQL 18.4; cluster `18/main` online.
- Effective PostgreSQL endpoints remained `127.0.0.1:5432` and `/var/run/postgresql/.s.PGSQL.5432`; no wildcard listener, firewall change, tunnel, forwarding, cloud resource, or network reconfiguration.
- Attempt 1 database, role, and temporary secret were absent before Attempt 2.
- Fresh database: `uygunayakkabi_lineage_rehearsal_20260726_182309`, OID `16417`.
- Fresh role: `uygunayakkabi_lineage_rehearsal_182309`, OID `16416`; login, connection limit 5, no superuser/create-role/create-database/replication/bypass-RLS.
- Cluster system identifier: `7666851257315582974`.
- Rehearsal URI SHA-256: `23EFE56C462AE7FC1DC10635DD8C334D5BC2E4794114F0D1110FE02EFE2E1123`; different from the forbidden application fingerprint.
- The new database's default PUBLIC CONNECT was revoked. CONNECT was granted only to the task role and `postgres`. Every built-in non-superuser role returned false from `has_database_privilege(..., 'CONNECT')`; unauthorized active connections remained zero.
- ACL fingerprints for `postgres`, `template0`, and `template1` were captured before provisioning and were identical after cleanup. No other database ACL changed.
- The unique random password remained only in a 0600 `postgres`-owned `/tmp` file and was never printed.

### Fresh baseline

- Minimal harness only; not a full Payload schema.
- Public tables: `image_generation_jobs`, `media`; seven representative pre-migration columns each.
- Rows: 2 per table; indexes: 2 primary keys; foreign keys: 0; all seven lineage columns absent.
- Stable original job hash: `040f1dfb61c18f8484fca4811acba2a4`.
- Stable original Media hash: `a0398bad1b6f0f915316e8ba6db7d090`.
- Harness SHA-256: `D5509A06635F0BD9A3FF62FF290253B2FE05613DBD17B399AEC0AFD27F427CA8`.

### Corrected rollback drill

`PASS`. One caller-owned transaction executed the exact corrected artifact. Seven columns existed inside the transaction; effective `lock_timeout` was 5 seconds and `statement_timeout` was 30 seconds. The same caller rolled back, after which all seven columns were absent, `pg_current_xact_id_if_assigned()` was null, table/index/FK counts matched baseline, and both legacy hashes were unchanged. Elapsed time: 98 ms; `psql` exit 0.

### Guarded real apply and schema verification

`PASS`. The Windows helper reached the WSL loopback target without an exposure workaround, with `PAYLOAD_DB_PUSH=false`, both confirmation flags, and only the dedicated target variable. It verified hash `06191F…961E2`, opened the single transaction, applied, verified, committed, redacted the target, and exited 0 in 692 ms.

Post-apply schema hash: `d9671f7908906d0c2a3a9604834b067f`. Exactly seven expected nullable, default-free, non-identity, non-generated `varchar`/`jsonb` columns existed. Index count remained 2, foreign keys 0, and legacy row counts/hashes remained stable. No backfill or unrelated schema object appeared.

### Complete compatibility evidence

- `OLD_STYLE_COMPATIBILITY_PASS`: legacy reads ignored new fields; old-shape inserts and legacy-only updates succeeded; omitted lineage stayed null; no default was injected; original rows/hashes remained stable.
- `NEW_LINEAGE_COMPATIBILITY_PASS`: `image-slot-contract/v1`, synthetic `iga_11111111-1111-4111-8111-111111111111`, representative JSONB, Media contract/job/attempt identifiers, and null lineage all round-tripped exactly.
- Canonical slots round-tripped in order and without coercion: `side`, `hero_3q`, `top`, `back`, `detail`.
- The first compatibility-fixture execution encountered an isolated `varchar[]` versus `text[]` assertion-type mismatch. Its open transaction rolled back on connection close, leaving fixture counts at baseline. The assertion was explicitly typed and the complete rerun passed; this was a validation-fixture defect, not a migration/schema defect.

### Idempotency and runtime-first rollback

- `IDEMPOTENT_PASS`: a second governed helper apply exited 0 in 724 ms. Schema hash stayed `d9671f7908906d0c2a3a9604834b067f`; full job hash stayed `bf48f813dd55dc14feaa3a2a04bb11b2`; full Media hash stayed `fe5ae1ef0032992b6194cd7b9708b3dd`; seven lineage columns remained singular.
- `RUNTIME_FIRST_ROLLBACK_PASS`: after new-lineage writes, old-shape reads, another old-shape insert, and legacy-only updates succeeded. Four old-shape job rows and four old-shape Media rows retained null lineage; all five new slot rows remained intact. No column removal was required.

### Cleanup and final state

`PASS`. Zero unauthorized and zero active task connections existed before cleanup. Only the exact Attempt 2 database and role were dropped; only its exact temporary secret was removed. Follow-up counts proved all three absent. Only `postgres`, `template0`, `template1`, and the `postgres` login remain. Cluster `18/main` remains online and local-only; packages were retained. ACLs on every other database matched the pre-attempt fingerprint.

### Attempt 2 files and final validation

The corrected evidence set changes 16 governance, migration, test, rehearsal, runbook, and Source Pack files: the migration SQL and guarded helper; their schema-governance and transaction-fixture tests; the disposable-database provision, baseline harness, compatibility, and runtime-first rollback SQL; the rehearsal-governance test; package scripts; this report; the migration plan; the deployment runbook and its governance test; and Source Pack documents 13 and 17. No `src/**` file changed.

Final validation was entirely local and passed:

- `npm run test:image-slot-lineage-schema`
- `npm run test:image-slot-lineage-helper`
- `npm run test:image-slot-lineage-rehearsal`
- `npm run db:image-slot-lineage:apply -- --dry-run --print-sql`
- `npm run test:image-generation-contracts`
- `npm run test:ops-runbook`
- `npm run test:source-pack`
- `npm run test:safe`
- `npm run typecheck`
- `npm run lint`

The dry run verified corrected hash `06191F196144259FB1992245B29849AA9353645E2160A03FC13B2F3F654961E2` without opening a database connection. No build or runtime smoke was required or run for this schema-harness-only reconciliation.

### Attempt 2 conclusion

- Primary classification: `SCHEMA_HARNESS_REHEARSAL_PASS`.
- `FULL_APPLICATION_COMPATIBILITY_NOT_PROVEN` remains; no complete isolated Payload schema or application runtime was exercised.
- Commits `58b2eaf2c035b0c94e7a7ce664f1a3b2f87db177` and `b806c7706b6f679de0cc1522f37b71e902b7d58f` are now technically schema-harness rehearsed against the corrected migration artifact. This does not authorize production migration, push, or deployment.
- Exact next task: **CHECKPOINT CORRECTED LINEAGE MIGRATION AND REHEARSAL EVIDENCE**.

## Attempt 1 — failed transaction-ownership rehearsal (preserved)

### 1. Git preflight

- Canonical root: `C:/Users/W11/Desktop/uygunayakkabi-store`
- Branch/HEAD: `main` at `b806c7706b6f679de0cc1522f37b71e902b7d58f`
- `origin/main`: `d83230224f4068c99c97e5b6c3d08f3e23e49725`; divergence `2 ahead / 0 behind`
- Initial worktree matched the three preserved evidence files and contained no `src/**` change or active Git operation.
- Exact committed migration SHA-256: `45963EF7FF50CDB99F3ED95BFE2E1F86D456CA99C95A7A5B325B47D3200518AC`

### 2. WSL discovery

- Distribution: Ubuntu 26.04 LTS on WSL 2; kernel `6.18.33.1-microsoft-standard-WSL2`.
- Linux user: `w11`; systemd running.
- Before operator installation there were no PostgreSQL packages, binaries, cluster, process, socket, listener, service unit, or PostgreSQL data/config directories.
- The operator completed the exact interactive installation command. Codex did not receive, automate, or print the sudo password.

### 3. Installation actions and system changes

Official Ubuntu packages installed: `postgresql 18+290ubuntu1`, `postgresql-18 18.4-0ubuntu0.26.04.1`, `postgresql-client-18 18.4-0ubuntu0.26.04.1`, `postgresql-common 290ubuntu1`, `postgresql-client-common 290ubuntu1`, `libpq5 18.4-0ubuntu0.26.04.1`, `libicu78`, `libjson-perl`, `libnuma1`, `liburing2`, `libxslt1.1`, and `ssl-cert`.

Package installation created and started cluster `18/main`, created PostgreSQL configuration/data/log paths under `/etc/postgresql/18/main`, `/var/lib/postgresql/18/main`, and `/var/log/postgresql`, installed the PostgreSQL and ssl-cert systemd enablement links, and retained package infrastructure after rehearsal. Data checksums are enabled. No Docker, cloud CLI, Windows service, firewall rule, or port-forwarding rule was added.

### 4. Local-only network proof

- Effective `listen_addresses`: `localhost`; port: `5432`.
- Observed PostgreSQL listener: `127.0.0.1:5432` only; no `0.0.0.0`, wildcard IPv6, LAN, or internet PostgreSQL listener.
- Unix socket: `/var/run/postgresql/.s.PGSQL.5432`.
- HBA: peer authentication for local sockets; SCRAM-SHA-256 only for `127.0.0.1` and `::1` host access.
- TLS is on and password encryption is `scram-sha-256`.

### 5. Database and role identity proof

- Before creation only `postgres`, `template0`, and `template1` databases and package-default PostgreSQL roles existed.
- Task database: `uygunayakkabi_lineage_rehearsal_20260726_180255`; database OID `16389`; cluster system identifier `7666851257315582974`.
- Task role: `uygunayakkabi_lineage_rehearsal_180255`; role OID `16388`.
- The role was a login role with connection limit 5, no superuser, inheritance, create-role, create-database, replication, bypass-RLS, or memberships. It owned the task database and received no explicit ownership elsewhere.
- Its unique 256-bit random password lived only in a 0600 `postgres`-owned `/tmp` file and was never printed.
- Rehearsal URI SHA-256: `E96DB16C94E6AC09EF74FE9AA43618A2AB8EC0588624048F9578B8A7DC1B3251`; it differs from the previously captured forbidden application-URI fingerprint prefix `47569A796C3177CA`.

### 6. Rehearsal level

`SCHEMA_HARNESS_REHEARSAL` was reached. The harness is explicitly minimal and is not a complete Payload schema. `FULL_APPLICATION_COMPATIBILITY_NOT_PROVEN` remains.

### 7. Baseline fingerprint

- PostgreSQL: 18.4 on Ubuntu; schema names: `information_schema`, `pg_catalog`, `pg_toast`, `public`.
- Public tables: `image_generation_jobs`, `media`; seven representative legacy columns in each.
- Indexes: only `image_generation_jobs_pkey` and `media_pkey`; foreign keys: 0.
- Rows: 2 image jobs and 2 Media fixtures.
- Stable legacy hashes: image jobs `040f1dfb61c18f8484fca4811acba2a4`; Media `a0398bad1b6f0f915316e8ba6db7d090`.
- All seven lineage columns were absent before migration.
- Harness SHA-256: `D5509A06635F0BD9A3FF62FF290253B2FE05613DBD17B399AEC0AFD27F427CA8`.

### 8. Transactional rollback-drill result

`FAIL`. The caller began a transaction and invoked the exact committed SQL unchanged. The SQL's own `BEGIN` emitted `there is already a transaction in progress`; its embedded `COMMIT` then committed the outer transaction. All seven columns were present, `pg_current_xact_id_if_assigned()` was null after the exact file returned, and the requested `ROLLBACK` emitted `there is no transaction in progress`. All seven columns remained after rollback. Clean diagnostic run elapsed 105 ms.

The first diagnostic verification command after the initial exact apply had a shell-quoting error and exited 1; it did not affect the already committed DDL. The immediately repeated exact-file drill used quote-free metadata verification, exited 0, and produced the conclusive transaction evidence above.

### 9. Exact migration apply result

The exact migration was applied by local WSL `psql` during the rollback drill. It used the committed 5-second lock timeout and 30-second statement timeout and committed successfully. The separately planned guarded real-apply phase was not run because the goal requires stopping after rollback-baseline restoration fails. The guarded helper therefore remains dry-run validated only.

### 10. Post-migration schema fingerprint

The committed apply produced exactly seven nullable, default-free, non-identity, non-generated columns with the expected `varchar`/`jsonb` types. Index count remained 2, foreign-key count 0, and no new-column default existed. Normalized post-apply schema hash: `d9671f7908906d0c2a3a9604834b067f`.

### 11. Legacy-row preservation

Both row counts and both stable legacy hashes remained identical after the failed rollback. No legacy row was deleted, backfilled, or rewritten by the migration.

### 12. Old-style compatibility

Baseline selects and the committed DDL preserved existing rows, but the requested post-expansion old-style insert/update sequence was not run because the mandatory rollback drill failed and required an immediate stop. Full old-style compatibility is not claimed.

### 13. New-lineage read/write proof

Not run after the mandatory rollback failure. JSONB and lineage value round trips are not claimed.

### 14. Slot-ID round-trip proof

Not run for `side`, `hero_3q`, `top`, `back`, or `detail` after the mandatory rollback failure.

### 15. Idempotency result

`IDEMPOTENT_PASS` for the exact SQL: the clean diagnostic repeat succeeded and emitted seven expected `already exists, skipping` notices. This does not cure the rollback-drill failure.

### 16. Runtime-first rollback result

Not rehearsed after the mandatory failure. The architectural incident strategy remains withdraw the new runtime, retain nullable columns, and restore the prior runtime without destructive column removal.

### 17. Cleanup result

`PASS`. Zero active task-database connections were found. Only the exact task database and role were dropped, and the exact temporary secret file was removed. Follow-up counts proved the database and role absent and the secret path absent. The package-created `18/main` cluster remains online and local-only with only `postgres`, `template0`, `template1`, and the `postgres` login role. Packages and default cluster infrastructure were intentionally retained.

### 18. Files changed

- `project-control/IMAGE_SLOT_LINEAGE_NONPROD_REHEARSAL_V1.md`
- `chatgpt-project-sources/13_VALIDATION_DEPLOYMENT_OPS.md`
- `chatgpt-project-sources/17_OPEN_QUESTIONS_AND_NEXT_SPRINT.md`
- `scripts/sql/image-slot-lineage-rehearsal-provision-v1.sql`
- `scripts/sql/image-slot-lineage-rehearsal-harness-v1.sql`

No `src/**`, committed migration SQL, environment file, stash, backup branch, or Git reference was changed. No commit was created.

### 19. Validation results

All permitted final validations passed with `PAYLOAD_DB_PUSH=false` where applicable: `npm run test:image-slot-lineage-schema`, guarded-helper dry-run with printed SQL, `npm run test:image-generation-contracts` (10 checks), `npm run test:ops-runbook`, `npm run test:source-pack` (20 documents), `npm run typecheck`, `npm run lint`, and `git diff --check`. Both new reusable SQL files also executed successfully against the disposable target. No new rehearsal-governance test was added. No normal application build or database runtime smoke was run.

### 20. Primary readiness classification

`REHEARSAL_FAIL`

### 21. Remaining limitations

- Transaction ownership is contradictory: the rehearsal protocol requires an outer rollback, while the exact committed artifact owns and commits its transaction.
- The task role had no explicit grants or ownership outside the task database, but PostgreSQL's package-default `PUBLIC CONNECT` privilege on the default `postgres` database was not changed; strict connection-level exclusivity was therefore not separately proven.
- Guarded confirmed apply, post-expansion old-style insert/update, new-lineage writes, slot round trips, and runtime-first rollback were intentionally not run after the hard failure.
- The evidence is schema-harness-only and does not prove full Payload application compatibility.
- The default-on Payload schema-push footgun remains outside this task.

### 22. Proportionality recommendation

Do not advance to production expansion preflight from this failed run. A full application-database rehearsal is not the next proportional step: first reconcile transaction ownership and make the mandatory schema-harness rollback protocol internally executable, then rerun the complete disposable harness. Once every required harness check passes, a schema harness is likely proportionate for this seven-column nullable, default-free, index-free, foreign-key-free expansion unless a separate real-Payload compatibility concern is identified.

### 23. Exact recommended next task

**IMAGE SLOT LINEAGE MIGRATION TRANSACTION-BOUNDARY RECONCILIATION V1**: choose one transaction owner for the migration and rehearsal, update the reviewed artifact or the governed drill protocol under separate authorization without touching production, refresh the expected SQL hash/governance evidence, and rerun the complete disposable WSL schema harness before any production expansion preflight.

## Historical blocked-run evidence (superseded)

The sections below preserve the earlier discovery/provisioning blocker record. They are historical only; the current result above supersedes their readiness and next-action statements.

## 1. Git preflight

- Canonical root: `C:/Users/W11/Desktop/uygunayakkabi-store`
- Branch: `main`
- HEAD: `b806c7706b6f679de0cc1522f37b71e902b7d58f`
- `origin/main`: `d83230224f4068c99c97e5b6c3d08f3e23e49725`
- Divergence after fresh fetch: `2 ahead / 0 behind`
- Worktree at provisioning preflight: exactly the three expected evidence files were modified/untracked; no other file and no `src/**` change was present
- Active Git operation: none
- Backup branch: `codex/backup-main-pre-governance-20260726-8a9cfcb` at `8a9cfcb1619e536dd53d4a9028f76ead65c8a0fb`
- Transfer stash: `f25b28a243bf219b1702df83ab6f8e93684ca17e`
- Pre-existing stash: `0d4b28ce106826fd9d42a48050f48baf75f61647`
- Committed migration SQL SHA-256: `45963EF7FF50CDB99F3ED95BFE2E1F86D456CA99C95A7A5B325B47D3200518AC`

All preflight values matched the rehearsal goal.

## 2. Target and WSL discovery without connection

Discovery inspected environment-key presence, redacted URI fingerprints, installed commands, Windows services/processes, and local listeners only. It did not open a socket to PostgreSQL.

### Tier A discovery

- `IMAGE_SLOT_LINEAGE_REHEARSAL_DATABASE_URI`: absent from the process environment, `.env.local`, `.env`, and repository files.
- No dedicated rehearsal metadata variables were present.
- The application `DATABASE_URI` exists in `.env`, parses as a credential-bearing remote PostgreSQL URI, and is forbidden by the task.
- Application URI fingerprint: `47569A796C3177CA`.
- Application endpoint fingerprint: `7EFCA38D3DFF7178`.
- Application remote-host fingerprint: `BAFAABC082A16AB2`.
- Application database-name fingerprint: `693FE5919FC229A2`.

The configured application URI was parsed locally for fingerprint metadata only. It was not connected to, printed, copied, or used by a command.

Result: no separately configured or independently proven Tier A target exists.

### Tier B discovery

- `psql`, `pg_isready`, `createdb`, `dropdb`, and `pg_ctl`: unavailable.
- PostgreSQL Windows services: 0.
- Running `postgres` processes: 0.
- PostgreSQL installation directory: absent.
- Candidate loopback listeners on ports 5432, 5433, 5434, 6432, and 6543: 0.
- Docker command: unavailable.
- Repository Docker Compose/local PostgreSQL configuration: absent.

Result: no already-running Windows loopback PostgreSQL server exists.

### Authorized Ubuntu WSL discovery

- Distribution: `Ubuntu`, WSL version 2, running and configured as the default distribution.
- Guest OS: Ubuntu 26.04 LTS; kernel `6.18.33.1-microsoft-standard-WSL2`.
- Linux user: `w11`, UID/GID 1000, member of the `sudo` group.
- Package manager: `/usr/bin/apt-get` present.
- `postgresql`, `postgresql-client`, `postgresql-common`, and `postgresql-contrib`: not installed.
- `psql`, `postgres`, `pg_ctlcluster`, `pg_lsclusters`, `createdb`, and `createuser`: absent.
- PostgreSQL processes, clusters, sockets, and service units: absent.
- `/var/lib/postgresql`, `/etc/postgresql`, and `/var/run/postgresql`: absent; no pre-existing PostgreSQL data ownership ambiguity was found.
- PostgreSQL candidate listeners on 5432 and 55432-55435: none. Other unrelated WSL services were not modified.
- Systemd is running. The PostgreSQL unit is not found/inactive.
- Non-interactive sudo probe: failed with `sudo: interactive authentication is required`.

The current goal authorizes minimum official Ubuntu PostgreSQL installation, but also requires stopping before installation when sudo needs interactive operator input. No password automation or privileged command was attempted.

Exact minimal operator command to run interactively inside Ubuntu WSL:

```bash
sudo apt-get update && sudo apt-get install --no-install-recommends postgresql
```

After that command completes, resume this goal. Do not add a public binding, firewall rule, port forward, cloud tunnel, project `DATABASE_URI`, or permanent secret.

## 3. Target identity proof

No target was selected because the authorized package installation could not cross the interactive-sudo boundary. Consequently there is no database identity, role authorization, disposable ownership marker, database-name hash, or target/application inequality proof to claim beyond the evidence that the only configured URI is the forbidden remote application URI.

Target tier: none.

Rehearsal level: none. Neither `SCHEMA_HARNESS_REHEARSAL` nor `FULL_APPLICATION_REHEARSAL` was reached.

## 4. Baseline schema fingerprint

Not captured because PostgreSQL could not be installed without operator-entered sudo authentication. No PostgreSQL version, schema, table metadata, indexes, foreign keys, row counts, or legacy-row hashes were queried.

The committed artifact baseline remains:

- tables expected: `public.image_generation_jobs`, `public.media`;
- expected new columns before rehearsal: absent;
- migration SQL SHA-256: `45963EF7FF50CDB99F3ED95BFE2E1F86D456CA99C95A7A5B325B47D3200518AC`.

This artifact baseline is not a database fingerprint.

## 5. Transactional rollback drill

Not run. No transaction began, no DDL was executed, and no rollback claim is made.

## 6. Migration apply result

Not run. The guarded helper was not invoked in confirmed apply mode. No environment file was loaded by an apply path, no PostgreSQL client connected, and no schema was mutated.

Result: `NOT_ATTEMPTED_LOCAL_PROVISIONING_BLOCKED`.

## 7. Post-migration schema fingerprint

Not available because the migration was not applied. No before/after schema comparison exists.

## 8. Exact intended schema delta

The committed SQL remains an additive, nullable, default-free expansion:

| Table | Column | Type |
|---|---|---|
| `image_generation_jobs` | `generation_contract_version` | nullable `varchar` |
| `image_generation_jobs` | `active_attempt_id` | nullable `varchar` |
| `image_generation_jobs` | `generation_attempts` | nullable `jsonb` |
| `media` | `generation_lineage_contract_version` | nullable `varchar` |
| `media` | `generation_lineage_job_id` | nullable `varchar` |
| `media` | `generation_lineage_attempt_id` | nullable `varchar` |
| `media` | `generation_lineage_slot_id` | nullable `varchar` |

Static governance confirms no default, index, foreign key, generated expression, backfill, destructive DML, or column removal. This is static evidence only, not rehearsal evidence.

## 9. Data compatibility evidence

Legacy-data preservation: not rehearsed.

Old-runtime-style reads, inserts, and updates: not rehearsed.

New-lineage JSONB and Media-lineage writes/reads: not rehearsed.

Slot-ID round trips for `side`, `hero_3q`, `top`, `back`, and `detail`: not rehearsed against PostgreSQL.

No row was inserted, updated, rewritten, backfilled, or deleted during this task.

## 10. Idempotency result

Not tested. No first or second database apply occurred. No `IDEMPOTENT_PASS` or single-apply claim is made.

## 11. Runtime compatibility

`FULL_APPLICATION_COMPATIBILITY_NOT_PROVEN`

Payload was not initialized against any database. No Level 2 application database was available, no build/runtime check ran, and no test Payload job or Media record was created.

## 12. Runtime-first rollback proof

Not rehearsed against PostgreSQL. The documented runtime-first rollback model remains an architectural expectation: expanded nullable columns should remain while the old runtime ignores them. This task produced no database evidence proving it.

## 13. Cleanup result

No package, database, schema, table, marker, role, connection, PostgreSQL process, service, container, or cloud resource was created. Therefore there was no task-created database, role, or credential file to terminate, drop, or remove. Existing unrelated WSL services were untouched.

Cleanup result: `NO_RESOURCE_CREATED`.

## 14. Installation and system-change result

- Packages installed: none.
- Package versions: not applicable.
- System files changed: none.
- Default cluster created or started: no.
- Firewall, port-forwarding, Windows service, public listener, and project environment changes: none.

## 15. Minimum provisioning requirements

Provide exactly one of the following before resuming the rehearsal.

For the currently authorized WSL path, the operator must first run the exact interactive command recorded in section 2. After installation, Codex must rediscover package versions, any package-created cluster, effective socket/listener configuration, and default database/role ownership before creating task data. A task-created non-superuser role, uniquely named disposable database, and protected temporary password outside the repository remain mandatory.

### Option A — proven full non-production target

1. Configure `IMAGE_SLOT_LINEAGE_REHEARSAL_DATABASE_URI` outside the repository.
2. Provide secret-safe operator evidence that it belongs to a distinct non-production provider project/branch and is not production or a production-data clone.
3. Prove its normalized endpoint fingerprint differs from `DATABASE_URI`.
4. Confirm the role is authorized for rehearsal DDL, disposable fixture writes, and cleanup.
5. Confirm it contains a representative pre-migration Payload schema if `FULL_APPLICATION_REHEARSAL` is expected.
6. Confirm no customer or production data is required.
7. Do not paste the URI or credentials into chat or commit them.

### Option B — disposable loopback schema harness

1. Outside this task, make an already-running PostgreSQL server available strictly on `localhost`, `127.0.0.1`, or `::1`.
2. Provide task-dedicated local credentials through `IMAGE_SLOT_LINEAGE_REHEARSAL_DATABASE_URI`; do not reuse `DATABASE_URI`.
3. Make `psql`/PostgreSQL tooling or an equivalent local client available.
4. Authorize the role to create and drop one uniquely named disposable rehearsal database.
5. Confirm the database does not pre-exist and no production data will be copied.
6. Accept that this proves only `SCHEMA_HARNESS_REHEARSAL`, not full Payload compatibility.

No Neon branch, cloud project, remote database, cloned dataset, public PostgreSQL reconfiguration, or production-like data is authorized by this report. The current goal authorizes only the minimum official Ubuntu PostgreSQL packages inside the existing WSL environment.

## 16. Production readiness and commit decision

Historical provisioning state at that time: blocked pending interactive sudo authentication (superseded).

Commits `58b2eaf2c035b0c94e7a7ce664f1a3b2f87db177` and `b806c7706b6f679de0cc1522f37b71e902b7d58f` are **not technically migration-rehearsed**. They remain local, unpushed, undeployed, and blocked from runtime activation pending database evidence.

Deployment status remains: `DEPLOYMENT_BLOCKED_PENDING_REVIEWED_SCHEMA_MIGRATION`.

Even a future rehearsal pass will not by itself authorize a production migration, Git push, or deployment.

## 17. Proportionality recommendation

No sufficiency decision can be made from this blocked run. If the resumed schema harness passes every required rollback, exact-delta, legacy/new-operation, idempotency, and cleanup check, that level is likely proportionate for a seven-column nullable, default-free, index-free, foreign-key-free expansion. A full application-database rehearsal would be materially justified only if the minimal harness cannot represent real table-name/type behavior, the guarded helper diverges from direct PostgreSQL execution, or independent Payload-schema compatibility concerns remain. Production expansion still requires a separate preflight and approval.

## 18. Exact next task

**COMPLETE THE INTERACTIVE UBUNTU POSTGRESQL PACKAGE INSTALLATION, THEN RESUME IMAGE SLOT LINEAGE SCHEMA HARNESS REHEARSAL V1**

Run `sudo apt-get update && sudo apt-get install --no-install-recommends postgresql` inside Ubuntu WSL. Then resume this same goal from package/cluster/listener discovery and secret-safe target creation. Do not skip the transactional rollback drill or misclassify a minimal local harness as full application compatibility.

## 19. Files changed

Only the three pre-authorized evidence files remain changed:

- `project-control/IMAGE_SLOT_LINEAGE_NONPROD_REHEARSAL_V1.md`
- `chatgpt-project-sources/13_VALIDATION_DEPLOYMENT_OPS.md`
- `chatgpt-project-sources/17_OPEN_QUESTIONS_AND_NEXT_SPRINT.md`

No `src/**`, migration SQL, package manifest, environment file, Git reference, stash, or backup branch was changed. No commit was created.

## 20. Validation results

All permitted static validations passed with `PAYLOAD_DB_PUSH=false` where applicable:

- `npm run test:image-slot-lineage-schema`
- `npm run db:image-slot-lineage:apply -- --dry-run --print-sql` (dry-run only; no environment load, connection, or DDL)
- `npm run test:image-generation-contracts` (10 checks)
- `npm run test:ops-runbook`
- `npm run test:source-pack` (20 documents)
- `npm run typecheck`
- `npm run lint`
- `git diff --check`

No rehearsal-governance file was added because provisioning stopped before a harness existed.
