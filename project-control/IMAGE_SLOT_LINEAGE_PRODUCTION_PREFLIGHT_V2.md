# Image Slot Lineage Production Pre-flight V2

Date: 2026-07-26

Primary classification: `PRODUCTION_EXPANSION_PREFLIGHT_V2_PASS`

Production schema classification: `ALL_SEVEN_COLUMNS_ABSENT`

This is a read-only evidence checkpoint. It does not authorize or perform production DDL, Git push, deployment, runtime activation, provider calls, Telegram commands, Payload initialization, or application-data inspection.

## 1. Git and migration boundary

- Canonical repository: `C:\Users\W11\Desktop\uygunayakkabi-store`.
- Branch before documentation: `main`.
- Starting HEAD: `aa6373f2a7c7f6d9f3aaa02e288d57dbd376f407`.
- `origin/main`: `d83230224f4068c99c97e5b6c3d08f3e23e49725` after a fresh fetch.
- Starting divergence: 6 ahead / 0 behind.
- Starting working tree: clean; no merge, rebase, cherry-pick, revert, or bisect active.
- The reviewed local chain remained exactly `58b2eaf -> b806c77 -> 832f972 -> 46c1c8d -> 7c1677b -> aa6373f`.
- Corrected migration SHA-256: `06191f196144259fb1992245b29849aa9353645e2160a03fc13b2f3f654961e2`.
- The retained backup branch and both retained stashes were not modified.

## 2. Vercel control-plane revalidation

Authenticated read-only Vercel inspection reconfirmed:

- canonical project `uygunayakkabi-store` and GitHub repository relationship;
- production branch `main`;
- serving READY production deployment `dpl_3YCzMcvfLu4jJmTW8caJRncuftxY`;
- serving source commit `8adfd1b955baf534da2b20595e6cdd2a407438fe`;
- production aliases still point to that deployment;
- no newer READY production deployment replaced it; newer attempts were canceled;
- exactly one `PAYLOAD_DB_PUSH` record in each of Production, Preview, and Development;
- each value is exact lowercase `false`;
- no contradictory branch-specific value was found.

Result: `PRODUCTION_PAYLOAD_SCHEMA_PUSH_CONTROL_PLANE_SAFE` remains effective. No Vercel state was changed.

## 3. Neon production identity

Authenticated Neon console inspection proved the Vercel database target through control-plane relationships, not labels alone.

| Evidence | Result |
| --- | --- |
| Provider | Neon |
| Account/organization | Operator organization on Free plan |
| Organization identifier SHA-256 | `4b0d13904601bf51100c4d977abc230c895c13ef3940c59a85694c0fa14dd75a` |
| Project | `uygunayakkabi`; the account's only project |
| Project identifier SHA-256 | `6ac315cbb06861f65c4ffd20a4c112a0c968be24e445385d47c001a5776e78b3` |
| Branch | `production`; only branch and designated Default |
| Branch identifier SHA-256 | `333ba784993476e5736525d2f6859d03b496940285c9bc2bdc3e398300c698d3` |
| Branch created | `2026-03-06 15:54:00 +03:00` |
| Region | AWS Europe Central 1 (Frankfurt) |
| Branch protection | Not protected; control unavailable on the Free plan |
| Compute | Primary compute, autoscaling 0.25 to 2 CU; normally suspends after 5 minutes idle and wakes on connection |

The Neon pooled endpoint label derived from the primary compute has SHA-256 `c0b8c8d97ec26f6713e6901c0285af23a3f3824536785d39555c15249fdb3663`, exactly matching the previously captured Vercel pooled endpoint-label hash. The database-name SHA-256 also matched the Vercel evidence. The same connection dialog switched between pooled and direct modes for this exact branch and primary compute.

Because Vercel has one `DATABASE_URI` record spanning Development, Preview, and Production, all three scopes currently share this Neon project, branch, logical database, and compute endpoint family. That topology is proven, not endorsed as long-term isolation.

Conclusion: `NEON_PRODUCTION_TARGET_IDENTITY_PROVEN`.

## 4. PostgreSQL and endpoint topology

- Neon console major version: PostgreSQL 17.
- Direct server result: `17.10 (2947584)`; `server_version_num=170010`.
- Server is not in recovery.
- Pooled endpoint-label SHA-256: `c0b8c8d97ec26f6713e6901c0285af23a3f3824536785d39555c15249fdb3663`.
- Previously captured full pooled-endpoint SHA-256: `bafaabc082a16ab2b6475cd3fff7be07c13e6e0a4f8612721a7c35f69963a863`.
- Direct endpoint-label SHA-256: `614e8dccce2afaa3905b2be4a4c0938624941456c095515fc96a84183eeea6ad`.
- Database-name SHA-256: `693fe5919fc229a2cf404ad99e03e8e9277fa4a6d34e88a0d4224d81b0b057a8`.
- Database-user SHA-256: `6f198191100386e1f0c093fc1c902c0520c6382059d75fb4743ec1ec75cc7842`.
- The direct endpoint lacks the Neon `-pooler` suffix and belongs to the same primary compute/branch as the pooled endpoint.
- Neon documents direct connections as the appropriate mode for migrations; pooled connections use PgBouncer transaction pooling and have session-feature limitations.
- Console limit: 894 usable direct connections and 10,000 pooled connections. PostgreSQL reported `max_connections=901`; Neon reserves seven, explaining the 894 usable direct total.
- Scale to zero is 5 minutes. A metadata connection wakes a suspended compute; this pre-flight closed its connection normally.

No endpoint hostname, URI, role name, or password is preserved in this report.

## 5. Backup, PITR, and current recovery point

The authenticated `Backup & Restore` page proved:

- instant point-in-time restore is available for the production branch;
- the configured history window is 6 hours;
- at inspection time, the earliest selectable point was `2026-07-26 15:18 +03:00`;
- the current/default selectable point was `2026-07-26 21:18 +03:00`;
- source branch `production` was fixed in the restore form;
- preview/time-travel inspection was available before restore;
- the operator account had an enabled Restore action;
- the UI describes the action as restoring the current branch in place;
- manual snapshots exist as a concept and `Create snapshot` was available, but no manual snapshot existed;
- scheduled snapshots were unavailable without a paid-plan upgrade;
- retention above 6 hours was unavailable on the current plan/configuration.

No snapshot, preview branch, restore, retention change, or plan change was performed. The future apply operator must refresh and record a recovery point immediately before DDL because the 6-hour window is rolling.

Neon's official restore guidance states that branch restore uses retained WAL history, Time Travel Assist can validate a chosen point, and a restore typically completes in seconds with brief database connectivity interruption. This is the documented emergency procedure; a database restore is not the normal rollback for nullable additive columns.

References:

- <https://neon.com/docs/connect/connection-pooling>
- <https://neon.com/blog/announcing-point-in-time-restore>
- <https://neon.com/docs/changelog/2025-10-31>

Conclusion: PITR capability, retention, a usable current recovery point, restore permission, and provider procedure are proven.

## 6. Temporary direct URI handling and cleanup

The existing direct URI was revealed only inside the authenticated Neon connection dialog and held transiently in browser/process memory. It was never printed, copied into a report, passed as a literal command argument, written to disk, committed, or stored in shell history.

Before connection, the endpoint label was hashed and required to match the proven direct label; a pooled suffix was rejected. The full URI differed from the pooled Vercel endpoint and from rehearsal variables. `PAYLOAD_DB_PUSH=false` was supplied to the bounded process. The direct PostgreSQL client received `default_transaction_read_only=on` at startup.

After inspection:

- the transaction was explicitly rolled back;
- the PostgreSQL connection was closed;
- temporary URI variables were cleared;
- the password was hidden again and the connection dialog dismissed;
- the Windows clipboard was left blank except for a harmless one-character placeholder after an earlier cleanup-wrapper error;
- no URI-bearing temporary file existed;
- repository and report scans are required before checkpointing.

Two transport attempts failed before any database connection because the visible connection snippet was initially parsed as a truncated hostname. A subsequent PostgreSQL-client diagnostic confirmed DNS failure before connection. Neither attempt ran SQL. The successful connection used the complete direct URI reconstructed in memory and ran exactly one governed transaction.

## 7. Read-only governance and enforcement

The permitted SQL set was fixed before the successful connection:

1. `BEGIN READ ONLY`.
2. `SET TRANSACTION READ ONLY`.
3. `SET LOCAL statement_timeout='15s'`.
4. `SET LOCAL lock_timeout='2s'`.
5. `SHOW`/`current_setting` and secret-safe identity/version checks.
6. Metadata-only `SELECT` statements against `pg_catalog` and `information_schema`.
7. `ROLLBACK`.

The metadata relations/functions used were limited to:

- `pg_catalog.pg_class`, `pg_namespace`, `pg_index`, `pg_attribute`, `pg_constraint`, `pg_locks`, and aggregate-only `pg_stat_activity`;
- `information_schema.columns`;
- `pg_total_relation_size`, `current_database`, `current_user`, `pg_is_in_recovery`, `current_setting`, and catalog aggregates.

No application table was selected. No product, Media, customer, order, lead, bot-event, JSON payload, or generated-media row was read. No DDL, DML, `COPY`, `CALL`, `DO`, advisory lock, temp object, extension side effect, role change, Payload initialization, or retry after a gate/identity failure occurred.

The successful session proved:

- `transaction_read_only=on`;
- `default_transaction_read_only=on`;
- `statement_timeout=15s`;
- `lock_timeout=2s`;
- direct target/database fingerprints matched control-plane evidence;
- PostgreSQL 17.10, not in recovery;
- final transaction outcome `ROLLBACK`;
- connection closed.

## 8. Production schema fingerprint

Normalized schema SHA-256 for the two relevant tables, their complete column metadata, and target-related indexes/foreign keys:

`b2b004c57c4e959af0d3fcc175d9081d30c8bf9a949a9c190222b49e7c26ddd3`

| Table | Catalog row estimate | Total relation bytes | Approximate size |
| --- | ---: | ---: | ---: |
| `image_generation_jobs` | 119 | 458,752 | 448 KiB |
| `media` | 641 | 1,417,216 | 1.35 MiB |

Fingerprint result:

- both required tables exist;
- target columns found: 0 of 7;
- target-column indexes found: 0;
- target-column foreign keys found: 0;
- all seven names are absent;
- no partial or incompatible lineage shape was found.

Exact production schema classification: `ALL_SEVEN_COLUMNS_ABSENT`.

At the observation instant, catalog lock aggregation found no granted or waiting relation lock on either target table. `pg_stat_activity` aggregation found one session, active (the bounded metadata session), zero idle-in-transaction sessions, and zero waiting sessions. These are point-in-time observations, not a promise about the future apply window.

## 9. Lock and workload risk

PostgreSQL 17 documents that `ALTER TABLE` takes `ACCESS EXCLUSIVE` unless a subform states otherwise. Adding nullable columns with no default does not require a table rewrite, so the seven additions are expected to be fast catalog changes. They are not zero-risk: `ACCESS EXCLUSIVE` conflicts with reads and writes and can queue behind long-running transactions.

The target relations are small, which reduces catalog/verification exposure but does not remove lock-wait risk. Known concurrent writers include:

- the 30-minute Vercel Payload job runner;
- Telegram image generation, regeneration, approval/rejection, and immediate job execution;
- image job hooks and generated-Media persistence;
- Telegram/photo/product intake;
- Payload admin Media uploads;
- automation Media attachment and other product/media-producing routes.

The existing migration's `lock_timeout=5s` and `statement_timeout=30s` remain suitable fast-fail bounds. One transaction across both tables is appropriate for all-or-nothing schema shape, but the first table's lock is held while the second lock is acquired and until commit. Therefore:

- use a low-traffic window immediately after a known cron completion;
- allow known image/media work to finish;
- hold new generation, regeneration, approval, intake, automation attach, and admin Media uploads for the short apply/verify window;
- stop on a lock timeout, statement timeout, unexpected active writer, schema drift, target mismatch, or helper verification failure;
- do not retry automatically.

References:

- <https://www.postgresql.org/docs/17/sql-altertable.html>
- <https://www.postgresql.org/docs/17/ddl-alter.html>
- <https://www.postgresql.org/docs/17/explicit-locking.html>

## 10. Future apply command template — do not run in this task

The future task must obtain the approved direct URI from a secret manager/ephemeral control-plane flow and must not paste it into logs or history.

```powershell
$env:PAYLOAD_DB_PUSH = 'false'
$env:IMAGE_SLOT_LINEAGE_DATABASE_URI = '<EPHEMERAL_DIRECT_PRODUCTION_URI>'
$env:IMAGE_SLOT_LINEAGE_PRODUCTION_TARGET_CONFIRMATION = '<APPROVED_PROJECT_BRANCH_DIRECT_ENDPOINT_FINGERPRINT>'

if ($env:IMAGE_SLOT_LINEAGE_PRODUCTION_TARGET_CONFIRMATION -ne '<APPROVED_PROJECT_BRANCH_DIRECT_ENDPOINT_FINGERPRINT>') {
  throw 'Production target confirmation mismatch.'
}

npm run db:image-slot-lineage:apply -- `
  --apply `
  --confirm-apply-image-slot-lineage-schema-v1
```

The separately authorized operator must verify the helper reports migration SHA-256 `06191f196144259fb1992245b29849aa9353645e2160a03fc13b2f3f654961e2`, owns one transaction, verifies the seven-column shape before commit, rolls back on failure, and never prints credentials. The external target-fingerprint check remains mandatory because the current helper's built-in confirmations do not independently identify the production project and branch.

## 11. Exact pre-apply checklist

1. Fetch and reconfirm the reviewed local chain and clean tree.
2. Reconfirm the serving old-runtime deployment and source commit.
3. Reconfirm exact `PAYLOAD_DB_PUSH=false` in Production, Preview, and Development with no contradictory override.
4. Reconfirm the Neon organization/project/production-default branch relationship.
5. Reconfirm the direct endpoint fingerprint and reject any pooled endpoint.
6. Refresh the rolling PITR window and record the current recoverable timestamp.
7. Re-run the strict read-only fingerprint and require `ALL_SEVEN_COLUMNS_ABSENT`.
8. Verify the corrected SQL SHA-256.
9. Confirm the low-traffic window and short operator hold on image/media writers.
10. Record explicit operator approval for production DDL and the rollback operator.
11. Run the guarded helper exactly once.
12. Require in-transaction seven-column verification and commit evidence.
13. Keep the old runtime active while post-expansion verification runs.

## 12. Immediate post-expansion verification plan

1. Require helper success, `COMMIT`, and the exact seven-column verification.
2. Open a new strict read-only direct-endpoint transaction.
3. Verify all seven columns have the expected type, permit null, have no default, and are neither identity nor generated.
4. Verify no target index or foreign key appeared and no unrelated schema changed.
5. Record the new normalized schema hash.
6. Verify the old production deployment and aliases remain healthy.
7. Check homepage/PDP, admin login surface, job endpoint passive health, and Telegram webhook passive health without a write-producing command.
8. Verify no Payload schema-push activity and no lineage writes before the new runtime deployment.
9. Review production errors/latency and close all migration/read-only connections.

## 13. Runtime push and deployment plan

Only after a separately authorized expansion passes:

1. Keep the old runtime healthy and serving.
2. Fetch `origin/main`.
3. Require the local seven-commit chain through this V2 evidence checkpoint, 7 ahead / 0 behind, clean, with no active Git operation.
4. Re-run approved validation and secret/scope scans.
5. Separately authorize and push local `main` without force.
6. Observe the automatically created Vercel production deployment.
7. Require the deployed Git SHA to match the seven-commit local head and all production aliases to resolve to its READY deployment.
8. Verify Payload initializes with effective `PAYLOAD_DB_PUSH=false` and performs no automatic schema push.
9. Re-run the strict seven-column metadata fingerprint.
10. Run a separately approved slot-lineage smoke without unnecessary provider calls.
11. Monitor Telegram/image jobs, Media writes, database health, and Vercel errors/latency.
12. Retain runtime-first rollback capability.

No push or deployment is authorized by this report.

## 14. Rollback decision tree

### Before migration commit

Trigger: lock timeout, statement timeout, SQL failure, target mismatch, read-only preflight drift, or verification failure.

Action: helper rolls back; old runtime remains active; inspect evidence; do not retry automatically; do not push Git.

### After migration commit, before runtime deployment

Trigger: old-runtime health issue, unexpected schema shape, provider/control-plane issue, or error spike.

Action: retain the nullable columns; keep the old runtime; stop rollout; do not restore or drop columns.

### After new runtime deployment

Trigger: initialization failure, lineage-write failure, Media persistence regression, Telegram image-flow regression, or critical error spike.

Action: roll back the runtime deployment first; retain nullable columns; pause new image/media work if needed; restore the database only for independently proven corruption using the refreshed Neon recovery point.

Never drop the seven nullable columns during incident response without a separate reviewed authorization.

## 15. Missing evidence and authorization boundary

No required pre-flight evidence is missing. The production target, server version, direct endpoint, backup/PITR window, current recovery point, read-only enforcement, schema shape, table estimates, and risk plan are proven.

Evidence completeness does not authorize DDL. The next task must separately approve the exact production target, fresh recovery point, low-traffic hold, helper command, SQL hash, apply operator, verification operator, and rollback operator.

## 16. Files in this checkpoint

- `project-control/IMAGE_SLOT_LINEAGE_PRODUCTION_PREFLIGHT_V2.md`
- `chatgpt-project-sources/01_CURRENT_TRUTH.md`
- `chatgpt-project-sources/03_SYSTEM_ARCHITECTURE.md`
- `chatgpt-project-sources/13_VALIDATION_DEPLOYMENT_OPS.md`
- `chatgpt-project-sources/17_OPEN_QUESTIONS_AND_NEXT_SPRINT.md`

No runtime, migration, schema, package, environment, fixture, generated-media, or deployment file is changed. The Source Pack remains exactly 20 files.

## 17. Local validation and scope scan

All required checks passed with `PAYLOAD_DB_PUSH=false` supplied to applicable processes:

- `npm run test:payload-db-push-policy`: PASS.
- `npm run test:image-slot-lineage-schema`: PASS.
- `npm run db:image-slot-lineage:apply -- --dry-run --print-sql`: PASS; exact SQL hash; explicit no-connect/no-DDL result.
- No reusable fingerprint artifact was created, so no additional fingerprint-governance test applies.
- `npm run test:image-generation-contracts`: PASS, 10 checks.
- `npm run test:ops-runbook`: PASS.
- `npm run test:source-pack`: PASS; exactly 20 Source Pack files.
- `npm run test:safe`: PASS, complete chain.
- `npm run typecheck`: PASS.
- `npm run lint`: PASS.
- `git diff --check`: PASS.

The final candidate scope contains only the five documents listed above, with zero `src/**` changes and zero generated-media files. Secret-safe scans found zero database URI literals, Neon endpoint hostnames, private-key markers, JWT-like strings, signed-URL credential parameters, email addresses, or phone-number-like values. Temporary production and migration URI environment variables are absent, and the clipboard contains no database URI.

## 18. Final decision

- Vercel schema-push remediation: PASS.
- Neon production target identity: PASS.
- PostgreSQL version and direct endpoint: PASS.
- Backup/PITR and current recovery point: PASS.
- Strict metadata-only read-only transaction: PASS and rolled back.
- Production schema: `ALL_SEVEN_COLUMNS_ABSENT`.
- Corrected migration can be applied unchanged in a separately authorized task: YES.
- Primary classification: `PRODUCTION_EXPANSION_PREFLIGHT_V2_PASS`.
- Exact next task: `APPLY PRODUCTION IMAGE SLOT LINEAGE EXPANSION V1`.
