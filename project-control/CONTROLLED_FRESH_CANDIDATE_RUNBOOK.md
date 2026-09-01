# Controlled Fresh Candidate Operator Runbook

Status: local Readiness Repair 1 contract. This runbook does not authorize
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

## Secret-injection contract

Actual local WSL secret values are not configured or tested by Readiness Repair
1. A later, separately authorized operator action must inject only the exact
runtime allowlist: authorization key, receipt/observation key, deployed commit
identity, environment identity, private manifest path, receipt path,
observation path, exact ledger path, database, Payload, Blob, canonical server
URL, and database push/drop safety flags. Values must enter through the process
environment, never CLI arguments, arbitrary shell files, repository `.env*`,
environment dumps, or downloaded deployment secrets.

The disconnected presence-only check is:

```text
npm run controlled-fresh-candidate:readiness -- --readiness
```

It reports only `PRESENT_NONEMPTY`, `PRESENT_EMPTY`, or `ABSENT` per variable
plus a boolean. A true result proves only contract-shape presence and fixed
safety values. It does not prove secret correctness, Production connectivity,
candidate readiness, or execution readiness.

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
