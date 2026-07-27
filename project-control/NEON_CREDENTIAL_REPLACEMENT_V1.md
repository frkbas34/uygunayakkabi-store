# Neon Credential Replacement V1

Date: 2026-07-27
Primary classification: `NEON_CREDENTIAL_REPLACEMENT_PASS`

## 1. Authorization and boundary

The operator explicitly authorized a zero-downtime replacement of the exposed
Neon credential, updates only to the proven Vercel database connection
variable, and two Vercel Redeploy operations from the unchanged known-good old
runtime source. The operation did not push Git, upload the local workspace,
deploy an unpushed commit, run a migration, change application data, change the
database schema, transfer ownership, call a commerce/provider surface, or
change any unrelated Vercel variable.

The previously completed production-expansion evidence was preserved first in
local commit `c356b46a35bd5b8c7416f9dae980a2fc2d58406e` with subject
`ops: record image slot lineage production expansion`.

## 2. Proven identities

Only one-way fingerprints are recorded. No URI, hostname, role name, password,
token, cookie, environment dump, customer record, or application row is in
this report.

| Identity | SHA-256 fingerprint |
| --- | --- |
| exposed transcript URI | `106be6948825d3e01d768fc0b3e09441cb2595832417acb58b55685781ca4aeb` |
| Neon organization | `4b0d13904601bf51100c4d977abc230c895c13ef3940c59a85694c0fa14dd75a` |
| Neon project | `6ac315cbb06861f65c4ffd20a4c112a0c968be24e445385d47c001a5776e78b3` |
| production/default branch | `333ba784993476e5736525d2f6859d03b496940285c9bc2bdc3e398300c698d3` |
| direct endpoint label | `614e8dccce2afaa3905b2be4a4c0938624941456c095515fc96a84183eeea6ad` |
| pooled endpoint label | `c0b8c8d97ec26f6713e6901c0285af23a3f3824536785d39555c15249fdb3663` |
| database | `693fe5919fc229a2cf404ad99e03e8e9277fa4a6d34e88a0d4224d81b0b057a8` |
| retained owner role | `6f198191100386e1f0c093fc1c902c0520c6382059d75fb4743ec1ec75cc7842` |
| replacement runtime role | `3f150ccb75fda9d517d869bb96f72476b59d5a11c9021c98f989937b1271cd62` |
| replacement direct URI | `a619666fc170b13736fd5c10db691fb410f38ab38409b1dbcaa6fcc94f0e12f8` |
| replacement pooled URI | `540aad084799f8c6cf6a753b4747ae627e4dc35d0fc7072500448ab3cb078055` |

Neon control-plane state remained the same single Frankfurt project, single
production/default branch, active primary compute, PostgreSQL 17, and rolling
6-hour history/recovery window.

## 3. Compromised-credential scope classification

Classification: **migration/control-plane credential for the same retained
owner role, not the current Vercel application password**.

Before cutover, the transcript credential failed a fresh direct authentication
with PostgreSQL code `28P01`. Production, Preview, and Development all used the
same pooled endpoint, database, and retained owner role, but their password
fingerprint differed from the transcript password and fresh pooled connections
succeeded. No other proven repository or control-plane consumer of the exposed
password was found.

The owner role nevertheless remained too broad for application use: it was a
non-superuser with `INHERIT`, `CREATEROLE`, `CREATEDB`, `REPLICATION`, and
`BYPASSRLS`, four inherited managed Neon memberships, ownership of 48 public
tables, 165 public indexes, and 42 public sequences, and complete privileges on
those objects.

## 4. Replacement-role design and proof

Granting membership in the retained owner role was rejected because it would
transitively inherit managed Neon privileges and ownership power. The
replacement instead received explicit runtime-only access:

- `LOGIN` and `INHERIT`;
- non-superuser, no `CREATEDB`, no `CREATEROLE`, no `REPLICATION`, and no
  `BYPASSRLS`;
- no membership in the retained owner role or any managed Neon role;
- no object ownership;
- database `CONNECT` and `TEMPORARY`;
- `USAGE` but not `CREATE` on the public schema;
- `SELECT`, `INSERT`, `UPDATE`, and `DELETE` on all 48 public application
  tables, with no `TRUNCATE`, `REFERENCES`, or `TRIGGER` grant;
- `USAGE`, `SELECT`, and `UPDATE` on all 42 public sequences;
- execution of public functions and matching default table, sequence, and
  function privileges for future owner-created objects.

The replacement connected successfully through both direct and pooled modes
with strict timeouts and read-only catalog transactions. It resolved to the
exact database and role fingerprints, retained the restricted role attributes,
owned zero objects, saw all seven lineage columns, and classified them as
compatible. The seven-column metadata fingerprint was
`adfb0f559a96dfa5715acbe8f5d3b89d49650eb9191905119ce51c8cc2cb18e6`.

PostgreSQL 17 automatically gave the retained creator role an admin-only,
non-inheriting, non-SET membership in the newly created role. This does not
grant any owner or managed privilege to the replacement runtime role.

## 5. Vercel environment cutover

The pre-cutover environment inventory had 43 records. Exactly one
`DATABASE_URI` record targeted Production, Preview, and Development. Three
`PAYLOAD_DB_PUSH` records were exact `false` in their respective scopes.

Only `DATABASE_URI` was updated, once for each required scope, using the
replacement pooled URI through protected standard input. Final state remained
one non-contradictory `DATABASE_URI` record targeting all three scopes. Fresh,
isolated control-plane downloads proved the replacement role/password
fingerprints and successful pooled connections in Production, Preview, and
Development. `PAYLOAD_DB_PUSH=false` remained exact in all three.

The unrelated environment metadata fingerprint stayed exactly
`808becf8af770318625e0963c996b8aa8c5c4bc3e7d4e344f8c073352e26eae3`
before and after the database-variable update. No unrelated environment record
changed.

## 6. Unchanged-runtime redeployments

The initial serving deployment was
`dpl_3YCzMcvfLu4jJmTW8caJRncuftxY`, sourced from unchanged old runtime commit
`8adfd1b955baf534da2b20595e6cdd2a407438fe`.

Vercel Redeploy, not a local workspace deployment, produced:

1. `dpl_8LtCEGe3ssrwGcf47grCwz3WQWZR` — first replacement-credential deployment,
   `READY`, exact old runtime commit, retained as the rollback candidate.
2. `dpl_7Qo8AUvrTcs4RbThdyaG6TGzEiCf` — second replacement-credential deployment,
   `READY`, exact old runtime commit, current production alias target.

The canonical alias transitioned from the initial deployment to the first and
then to the second. Final alias resolution returned the second deployment.
Both replacement deployments remained `READY`; the rollback deployment URL
returned HTTP 200.

After each transition and again after owner-password invalidation, `/`,
`/yardim`, and `/admin` returned HTTP 200. Final passive logs contained zero
warning/error/fatal records, HTTP 5xx responses, authentication failures,
database-connection failures, schema-push signals, DDL signals, or
missing-column errors.

## 7. Retained-owner credential invalidation

The retained owner must continue to own the database and existing objects; it
was not dropped and no ownership was transferred. Neon rejects direct
`NOLOGIN PASSWORD NULL` changes for this managed owner with `42501`, including
through its SET-enabled managed administrator membership. Neon’s signed-in
control plane exposes password reset, not a disable-login action, for this
owner type.

The supported control-plane reset was therefore used. The generated owner
password was never copied, printed, logged, persisted, or placed in Vercel; it
was immediately discarded by closing the reset result. The managed owner
remains LOGIN-capable by Neon topology, but no known usable password is retained
and Vercel no longer references the role.

Final one-shot proofs:

- the originally exposed transcript URI failed with `28P01`;
- the former active owner credential failed through the direct endpoint with
  `28P01`;
- the former active owner credential failed through the pooled endpoint with
  `28P01`;
- replacement direct and pooled read-only connections still succeeded;
- the owner still owned exactly 48 public tables, 165 public indexes, and 42
  public sequences;
- the replacement still owned zero objects and retained only the explicit
  runtime privileges.

This makes both exposed and superseded owner credentials unusable without
changing ownership or application data.

## 8. Schema, data, and cleanup evidence

Production remained `ALL_SEVEN_COLUMNS_PRESENT_COMPATIBLE`. The previously
verified full post-expansion schema fingerprint remains
`144383bd0db88073de88e075538b16ac91e78d823d7652703ff7d56b61c8e5b1`;
this operation executed no schema statement or migration. Current direct and
pooled catalog checks reproduced the compatible seven-column tuple and its
metadata fingerprint. No application-row read or write was performed.

All database clients were closed. The ACL-protected temporary cutover state and
all temporary audit/update helpers were deleted. No credential was copied to
the clipboard. Repository scans and Git review must remain clean before the
evidence commit.

## 9. Final classification and next boundary

Primary classification: `NEON_CREDENTIAL_REPLACEMENT_PASS`

No Git push occurred. No local workspace or unpushed commit was deployed. The
durable lineage runtime remains unpushed and undeployed.

Exact next task:

`PUSH AND DEPLOY DURABLE IMAGE SLOT IDENTITY RUNTIME V1`
