# Controlled Fresh Candidate Operator Runbook

Status: local Activation Readiness Configuration Route Repair 2 contract. This runbook does not authorize
Production connectivity, candidate selection, package preparation with real
inputs, execution, generation, publishing, Shopier, advertising, or dispatch.

## Responsibility split

- Windows owns repository review, source validation, and ordinary local build
  work. It must not hold controlled runtime artifacts.
- WSL/Linux owns the private ledger, offline package preparation, runtime, and
  read-only observation. Those operations are refused outside Linux native
  ext4.
- Offline preparation and Production execution are separate Owner gates. A
  prepared package is not execution authorization and is never publishing
  authorization.

## Fixed private ledger

The only approved root is:

`/home/w11/.local/share/uygunayakkabi/controlled-fresh-candidate`

The root and operation directories must be owned by the executing WSL UID,
native ext4, mode `0700`, single-linked, and free of symlink or mount-crossing
ambiguity. Private files must be regular, single-linked files at mode `0600`.
There is no repository, `/tmp`, Windows, DrvFS, `/mnt/c`, 9p, or tmpfs fallback.
Unexpected existing objects are a stop condition.

## Authorization lifetime

Execution authorization v3 binds `issuedAt`, `notBefore`, and `expiresAt` into
the canonical authorization identity and HMAC. All timestamps use exact UTC
millisecond `Z` form. `issuedAt <= notBefore < expiresAt`, and the complete
window is at most 30 minutes. Before-`notBefore`, at-expiry, expired,
non-canonical, backward-clock, legacy, mixed-version, and replayed grants fail
closed. Expiry never renews or recycles a grant. After consumption there is no
automatic retry, extension, replacement, or new authorization.

## Canonical native-WSL secret source

The only project-owned source for the local controlled runtime is:

`/home/w11/.config/uygunayakkabi/controlled-fresh-candidate/runtime-secrets.env`

It is outside the repository, operation ledger, DrvFS, `/mnt/c`, deployment
artifacts, shell profiles, and generic application `.env` files. The final
directory must be native ext4, owned by the executing WSL UID/GID, mode `0700`,
and symlink-free. The file must be a stable regular file owned by the same
UID/GID, mode `0600`, link count one, bounded in size, and opened with
no-follow descriptor validation. BOM, NUL, invalid UTF-8, duplicate, additional,
missing, empty, malformed, unstable, symlinked, hard-linked, or replaced input
fails closed.

The loader closes its validated descriptor exactly once. A body/metadata/format
failure remains authoritative if close also fails. If an otherwise successful
read cannot close conclusively, readiness fails with the stable sanitized
`CONTROLLED_CONFIGURATION_FILE_CLEANUP_UNCERTAIN` code. No raw filesystem error,
stack, secret path, or secret value is returned, and uncertain state is never
deleted or replaced automatically.

The persistent file contains exactly these five names and nothing else:

1. `CONTROLLED_FRESH_CANDIDATE_AUTHORIZATION_KEY_BASE64`
2. `CONTROLLED_FRESH_CANDIDATE_RECEIPT_KEY_BASE64`
3. `DATABASE_URI`
4. `PAYLOAD_SECRET`
5. `BLOB_READ_WRITE_TOKEN`

It is parsed as data. It is never sourced, evaluated, interpolated, copied into
the repository, displayed, hashed for reporting, or passed on a command line.
The loader creates a new null-prototype environment and adds only the fixed
production identity `uygunayakkabi-controlled-candidate-production-v1`, the
separately verified full deployed commit SHA, the approved ledger root,
`https://www.uygunayakkabi.com`, and hard-pinned `PAYLOAD_DB_PUSH=false` and
`PAYLOAD_DROP_DATABASE=false`. Ambient `PATH`, `NODE_OPTIONS`, loader/library,
proxy, shell-function, package-manager, and unrelated secret variables are not
copied.

## Secret bootstrap, key lifecycle, and recovery

The governed bootstrap entry point is:

```text
/home/w11/.local/bin/node /mnt/c/Projects/uygunayakkabi-store/node_modules/tsx/dist/cli.mjs /mnt/c/Projects/uygunayakkabi-store/scripts/controlled-fresh-candidate-secret-bootstrap.ts --bootstrap --confirm-controlled-fresh-candidate-secret-bootstrap
```

It is Linux/WSL and interactive-TTY only. Database, Payload, and Blob values are
collected with no echo. Authorization and receipt keys are generated
independently with a cryptographically secure generator at 256 bits each and
canonical base64 encoding. Observation authentication intentionally uses the
receipt/observation key with the separate observation v1 HMAC domain; execution
authorization, receipt v3, receipt-consumption v3, and observation v1 domains
remain distinct.

Bootstrap refuses overwrite and unexpected existing state. It writes a mode
`0600` exclusive temporary file in the final native-ext4 directory, flushes the
file, atomically publishes the already-complete bytes without replacement,
flushes the directory, removes the temporary link, flushes the directory again,
and verifies the final single-link file before reporting success. Partial write,
publication, flush, close, link-count, or verification uncertainty is
`RECOVERY_REQUIRED`. Do not retry, delete, rename, replace, or rotate uncertain
state automatically.

No key rotation is permitted while an operation package or unconsumed receipt
depends on the old key. Rotation, replacement, deletion, and recovery each
require a separate explicit maintenance task. These local controlled-runtime
keys must not be copied into Vercel merely to support this local runtime.
Bootstrap real mode was not run by this repair.

## Two-stage readiness contract

Secret readiness contract v2 has exactly two stages:

- `configuration` requires the five persistent secrets, separately verified
  full deployed commit identity, fixed production environment identity, fixed
  ledger and server values, safe database flags, and a secure empty approved
  ledger. It does not require operation-bound paths and never implies selection,
  package preparation, authorization, execution, or publishing.
- `execution` requires every one of the exact 14 runtime entries. The private
  manifest, receipt, and observation paths must share one canonical operation
  directory beneath the approved ledger and must come from one exact package-
  builder result. The loader validates the runtime manifest, original evidence,
  authorization v3 HMAC and active window, receipt destination binding, and
  observation v1 HMAC before marking the returned environment authenticated.
  The runtime refuses default execution without that authenticated environment.

The configuration check for a separately verified deployed SHA is launched in
an otherwise empty process environment:

```text
env -i HOME=/home/w11 USER=w11 LOGNAME=w11 CONTROLLED_FRESH_CANDIDATE_DEPLOYED_COMMIT_IDENTITY=<SEPARATELY_VERIFIED_FULL_SHA> /home/w11/.local/bin/node /mnt/c/Projects/uygunayakkabi-store/node_modules/tsx/dist/cli.mjs /mnt/c/Projects/uygunayakkabi-store/scripts/controlled-fresh-candidate-secret-contract.ts --readiness --stage=configuration
```

Output is contract identity/version, stage, fixed booleans, exact variable
names, per-variable requirement and `PRESENT_NONEMPTY`, `PRESENT_EMPTY`, or
`ABSENT` only. `configurationReady:true` still reports
`executionReady:false`, `candidateSelected:false`, `packagePrepared:false`,
`authorizationCreated:false`, and `eligibleForPublishing:false`.

## Production connectivity-only gate

Production connectivity is a separate Owner gate. Its governed entry point is:

```text
env -i HOME=/home/w11 USER=w11 LOGNAME=w11 CONTROLLED_FRESH_CANDIDATE_DEPLOYED_COMMIT_IDENTITY=<SEPARATELY_VERIFIED_FULL_SHA> /home/w11/.local/bin/node /mnt/c/Projects/uygunayakkabi-store/node_modules/tsx/dist/cli.mjs /mnt/c/Projects/uygunayakkabi-store/scripts/controlled-fresh-candidate-connectivity.ts --confirm-controlled-fresh-candidate-production-connectivity
```

The command first requires Linux/WSL, configuration readiness, the exact clean
`main` checkout at the supplied deployed SHA, an empty approved ledger, safe
database flags, and absence of all three operation-bound inputs. It uses one
direct installed `pg.Client`, no Payload initialization and no pool, retry, or
reconnect path. The only SQL sequence is:

1. `BEGIN TRANSACTION READ ONLY`
2. `SHOW transaction_read_only`
3. `SELECT 1 AS controlled_liveness`
4. `ROLLBACK`

Connect, query, rollback, and close are bounded. Close is requested exactly once;
any rollback or close uncertainty remains non-successful. Output contains only
fixed status, lifecycle counters, readiness/read-only/liveness/rollback/close
booleans, zero-mutation assertion, and `eligibleForPublishing:false`. It never
reports a connection string, host, database/server identity, raw error, or
stack. Real Production connectivity was not run by this repair.

Each bounded operation keeps its timeout referenced until the operation settles
and clears it afterward. An unresolved Promise therefore reaches its explicit
timeout instead of permitting the CJS/tsx process to disappear, while a settled
operation leaves no artificial process-liveness handle. Late settlement is
observed, timeout cannot become success, and rollback/close uncertainty remains
sticky.

Repair 1 review evidence showed that the connectivity test could previously exit
`0` with empty output before completing. Release was withheld despite that
review's approval label. Repair 2 completion governance now requires the exact
62/62 parent sentinel, including a 60/60 sanitized-child run and a fault control
that reproduces and rejects the prior empty-output exit-0 ordering. Five
consecutive direct runs completed at 62/62. Executed isolated source mutations
cover two-stage readiness, runtime stage separation, fixed read-only SQL,
Payload/Product/Media exclusion, Product 349 exclusion, no write/DDL, no retry or
reconnect, sticky cleanup uncertainty, and exactly-once close. These tests used
no real secret and made no Production connection.

## Offline package preparation

Safe modes are:

```text
npm run controlled-fresh-candidate:package -- --help
npm run controlled-fresh-candidate:package -- --readiness
npm run controlled-fresh-candidate:package -- --synthetic-dry-run
```

Real preparation remains blocked until the Owner separately approves candidate
selection and supplies a private canonical offline input file through the
documented process-environment path. The governed preparation form is shown
only as a placeholder:

```text
export CONTROLLED_FRESH_CANDIDATE_OFFLINE_INPUT_PATH=<OWNER_SUPPLIED_PRIVATE_EXT4_PATH>
npm run controlled-fresh-candidate:package -- --prepare --confirm-controlled-fresh-candidate-package-preparation
```

The input may contain only offline owner evidence and original bytes. It may
not identify or discover Product 349, an existing Product, or existing Media.
The builder performs no database, Payload, provider, Blob, Telegram, queue, or
network activity. It creates one unique immutable operation directory, writes
the authenticated pre-start observation first, and writes the private runtime
manifest last. HMAC keys are never written into the package. A failure is
recovery-required; do not infer no-op from file presence and do not retry,
delete, replace, renew, or clean uncertain durable evidence.

## Read-only observation

For an Owner-approved operation whose environment was configured separately:

```text
npm run controlled-fresh-candidate:observe -- --observe --operation=<IMMUTABLE_OPERATION_ID>
```

The observer reads one authenticated snapshot under the exact operation
directory. It has no control or mutation command, listener, endpoint, Telegram
surface, Production polling, authorization consumption, or receipt
consumption. Output is limited to operation identity, phase, governed-resource
counters, pool shutdown state, terminal scope, receipt state, strict-verifier
status, natural-exit expectation, existing public mutation counts, outcome,
staleness, and `eligibleForPublishing=false`.

Expected successful terminal evidence is `phase=closed`,
`terminalScopeState=CLOSED`, zero pending/checked-out/standalone resources,
matched destructive release request/completion counts, sufficient physical
removal evidence, Pool shutdown started and settled, authenticated receipt
state, and `naturalExitExpectation=EXPECTED`. `TERMINAL_UNCERTAIN`, stale,
tampered, truncated, wrong-operation, release/removal uncertainty, Pool-end
uncertainty, or observation failure is non-successful.

## Mandatory stop and Owner gates

Stop on any filesystem, ownership, mode, device, inode, link-count, canonical
input, clock, HMAC, operation binding, environment, resource cleanup,
observation, receipt, or replay uncertainty. Preserve evidence and report the
sanitized recovery-required state. Never retry, delete, replace, renew, or
automatically clean uncertain application state.

Four independent Owner approvals remain required after independent code review:

1. candidate selection (Product 349 remains excluded and undisclosed);
2. local WSL secret configuration;
3. Production connectivity;
4. one controlled execution.

None implies another. Even a successful controlled candidate remains draft,
inactive, non-sellable, quarantined, and `eligibleForPublishing=false`.
Publishing, generation, provider, Shopier, advertising, dispatch, and unrelated
mutation remain prohibited.
