# Durable Image Slot Identity Runtime Deployment V1

Date: 2026-07-27

Primary classification: `DURABLE_SLOT_RUNTIME_DEPLOYMENT_PASS`

## Authorization and boundary

The operator authorized the reviewed nine-commit `main` push, canonical Vercel
Git deployment, passive health and read-only schema verification, and one local
documentation checkpoint. The authorization excluded local-workspace deployment,
force push, history rewrite, schema or environment mutation, credential rotation,
provider/Telegram/image-generation/Media/application-data actions, and unrelated
runtime implementation.

## Git preflight and outgoing chain

The canonical root was `C:/Users/W11/Desktop/uygunayakkabi-store`, branch `main`,
with clean worktree and no active Git operation. Local HEAD was
`e0b60f6c83f6fa6d59dd6647558eca6883acb341`; `origin/main` was
`d83230224f4068c99c97e5b6c3d08f3e23e49725`; divergence was 9 ahead / 0 behind.

The exact chain was:

1. `58b2eaf2c035b0c94e7a7ce664f1a3b2f87db177` — `feat: add durable image slot identity foundation`
2. `b806c7706b6f679de0cc1522f37b71e902b7d58f` — `chore: add image slot lineage migration plan`
3. `832f972c14ae29a14be083dac1cf89ba23238406` — `fix: reconcile lineage migration transaction boundary`
4. `46c1c8def4f3c042e25d05857b6ee2bd5be37a11` — `docs: record lineage production preflight`
5. `7c1677b397a12f32ef9fd0b325df24d1310edf2b` — `fix: make payload schema push fail closed`
6. `aa6373f2a7c7f6d9f3aaa02e288d57dbd376f407` — `ops: record payload schema push remediation`
7. `7f5256f9b81a78a22812cf2c75c06e4c3f95139e` — `ops: record lineage production preflight v2`
8. `c356b46a35bd5b8c7416f9dae980a2fc2d58406e` — `ops: record image slot lineage production expansion`
9. `e0b60f6c83f6fa6d59dd6647558eca6883acb341` — `ops: record neon credential replacement`

Backup branch `codex/backup-main-pre-governance-20260726-8a9cfcb` remained at
`8a9cfcb1619e536dd53d4a9028f76ead65c8a0fb`. Transfer stash
`f25b28a243bf219b1702df83ab6f8e93684ca17e` and pre-existing stash
`0d4b28ce106826fd9d42a48050f48baf75f61647` were untouched.

## Scope, policy, and secret audit

The 37-file cumulative diff contained 9 runtime, 3 configuration, 10 governed
migration/tooling, 8 project-control, 6 Source Pack, and one legacy-redaction file.
Every commit and file was classified. `image-slot-contract/v1`, semantic slots
`side`, `hero_3q`, `top`, `back`, and `detail`, immutable execution attempt IDs,
failure-preserving slot association, and legacy compatibility matched the reviewed
implementation. Tests proved unchanged prompt/provider/transform/brand-access
policy. Required prompt digest
`4050a83f01eae0c200b013ce9fc744b41890f49180cb1af0e2173e2a38adb810`
and migration SHA-256
`06191F196144259FB1992245B29849AA9353645E2160A03FC13B2F3F654961E2`
matched exactly.

The resulting 37-file snapshot and all 4,451 added lines were scanned for live
PostgreSQL/Neon URIs and hosts, Vercel/Telegram tokens, JWTs, and private keys.
Findings were zero. No generated product media or private export was outgoing.
The tracked legacy artifact changed by one redaction only and retained no live URI.

## Local validation

These passed before push: `test:image-generation-contracts`,
`test:image-slot-contract`, `test:payload-db-push-policy`,
`test:image-slot-lineage-schema`, guarded-helper no-connect dry run,
`test:ops-runbook`, `test:source-pack`, `test:safe`, `typecheck`, `lint`,
`validate`, and `git diff --check`. `validate` executed `typecheck`, `lint`, then
`test:safe`. No local production-database build or PostgreSQL-connected validation
was run.

## Production safety preflight

Before push, canonical alias `uygunayakkabi.com` served READY old-runtime
deployment `dpl_7Qo8AUvrTcs4RbThdyaG6TGzEiCf`; READY
`dpl_8LtCEGe3ssrwGcf47grCwz3WQWZR` remained the secondary rollback candidate.
Both used old commit `8adfd1b955baf534da2b20595e6cdd2a407438fe` and the replacement credential.

Isolated authenticated checks proved Production, Preview, and Development each
had exact `PAYLOAD_DB_PUSH=false` and matching replacement pooled endpoint/role/
database/password fingerprints. No value was printed or changed. Replacement direct
access succeeded; the former exposed credential failed with SQLSTATE `28P01`.
Neon project `uygunayakkabi`, branch `production`, showed an active primary compute,
PostgreSQL 17, and a current six-hour PITR window.

A strict read-only direct transaction reported PostgreSQL 17.10,
`transaction_read_only=on`, exact `ALL_SEVEN_COLUMNS_PRESENT_COMPATIBLE`, zero
target indexes, and zero target foreign keys.

## Ignored-build audit, push, and deployment

`scripts/should-build.sh` compares `VERCEL_GIT_PREVIOUS_SHA` with
`VERCEL_GIT_COMMIT_SHA`, not only the new HEAD. The full diff contained runtime
paths, so a normal build was expected. No ignored-build fallback was needed.

`git push origin main:main` fast-forwarded `d832302` to `e0b60f6` without force.
Local and remote `main` then matched at 0/0 with a clean worktree.

Vercel automatically created production deployment
`dpl_EtChj9RhyqpAuy3M7C18BdX24Mnz` from remote Git repository
`frkbas34/uygunayakkabi-store`, branch `main`, exact commit
`e0b60f6c83f6fa6d59dd6647558eca6883acb341`. It entered BUILDING at
2026-07-27T17:37:43.517Z and became READY at 2026-07-27T17:38:13.961Z.
No local workspace/archive upload, redeploy fallback, or separate promotion occurred.

Build output showed dependency installation, successful compilation in 9.2 seconds,
20/20 static pages, build completion in 19 seconds, and deployment completion.
Secret-safe classification found zero schema-push/DDL, database-authentication,
missing-column, import-map, provider-call, fatal/error/warning, or secret matches.
Production and `www` aliases belong to the exact deployment. Its immutable hostname
is Vercel-SSO protected; the canonical public alias is the serving verification surface.

## Passive health and post-deploy schema

Body-discarded GET checks returned HTTP 200 for `/`, `/yardim`, and `/admin`.
Three resulting deployment log events contained zero HTTP 5xx, database auth,
missing-column, Payload-init, schema-push/DDL, image-contract, Media-schema,
cold-start-crash, or secret signal. No login or form submission occurred.

A second strict read-only direct transaction used catalog-only reads, final
`ROLLBACK`, and connection close. It reconfirmed PostgreSQL 17.10, read-only mode,
the replacement role/database fingerprints, exact seven-column type/null/default/
identity/generated shape, zero target indexes/FKs, and full two-table catalog hash
`d4b67f220ff791631a8d889725dd2f71e941efaff5a5fd2bafc70ff445e23cb3`.
That hash was byte-for-byte unchanged from pre-deploy and remains structurally
compatible with expansion evidence fingerprint
`144383bd0db88073de88e075538b16ac91e78d823d7652703ff7d56b61c8e5b1`.
No application row was read; no DDL or automatic schema push occurred.

## Rollback and final boundary

No rollback was needed. `dpl_7Qo8AUvrTcs4RbThdyaG6TGzEiCf` and
`dpl_8LtCEGe3ssrwGcf47grCwz3WQWZR` remained READY old-runtime rollback candidates.
No provider, Telegram command, image generation, Media upload, application-data
mutation, Shopier, Meta, X, n8n, credential/environment mutation, or schema mutation
occurred. The runtime is deployed and passively healthy; provider and end-to-end image
workflow behavior is not yet production-smoke-proven.

Post-deployment evidence validation passed the four focused lineage/policy tests,
the no-connect helper dry run, ops-runbook and 20-file Source Pack governance,
`test:safe`, `typecheck`, `lint`, and `git diff --check`. The first documentation
pass exposed one missing historical `D-501` marker through provider-reality
governance; the marker was restored and both the focused assertion and complete
safe suite passed on rerun.

Exact next task: `CONTROLLED PRODUCTION DURABLE SLOT IDENTITY SMOKE V1`.
