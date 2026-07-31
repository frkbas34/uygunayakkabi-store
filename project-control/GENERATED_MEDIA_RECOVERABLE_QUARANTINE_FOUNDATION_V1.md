# Generated Media Recoverable Quarantine Foundation V1

Status: local implementation and contradiction-gate patch complete, not committed, not pushed, not deployed

Verified: 2026-07-31 (Europe/Istanbul)

Contract: `generated-media-quarantine/v1`

Manifest: `generated-media-quarantine-manifest/v2`

Relationship fingerprint: `generated-media-relationship-fingerprint/v2`

## Outcome

This foundation defines proposal, quarantine, restore, manifest, fingerprint, hold, and legacy-evidence contracts without enabling a mutation path. It preserves these invariants:

```text
Rejected != Deleted
Quarantine proposal != Quarantine authorization
Quarantined != Physically removed
Orphan suspected != Safe to remove
Missing lineage != Inferable lineage
Manifest creation != Mutation permission
```

No Media, Product, job, relationship, gallery, Blob object, provider, Telegram, publishing, Shopier, schema, or production row was mutated. No production manifest or batch was created. Every contract output keeps `quarantineAuthorization=false`, `restoreAuthorization=false`, `physicalDeleteAuthorization=false`, and `mutationPermission=false`.

### Contradiction-gap correction

The original local draft trusted the summarized retention decision before independently reconciling cleanup-critical raw relationships and workflow state. A caller could therefore supply proposal-eligible retention evidence while raw gallery, publishing, Shopier, order, campaign, job, review, hold, lineage, or object evidence contradicted it. That defect was classified `QUARANTINE_ELIGIBILITY_CONTRADICTION_GAP`.

The corrected contract requires explicit tri-state raw evidence (`true`, `false`, or `unknown`), merges it conservatively with normalized relationship snapshots and retention state, and evaluates one independent contradiction gate before retention-window eligibility. Positive, unknown, missing, stale, or conflicting evidence fails closed as `quarantine_ineligible`, `manual_review`, or `evidence_changed_reauthorize`. Contradictory evidence cannot enter a manifest.

## Architecture

### Pure contract layer

`src/lib/generatedMediaQuarantine.ts` is provider-neutral and has no Payload, database, Blob, Telegram, or provider client. It owns:

- explicit generated-Media lineage and Legacy Evidence Bridge inputs;
- canonical JSON serialization and SHA-256 hashing;
- normalized relationship and evidence fingerprints;
- an independent raw-evidence contradiction gate with deterministic precedence;
- deterministic, deeply frozen quarantine-batch manifests;
- proposal eligibility and hold evaluation;
- exact pre-mutation revalidation results;
- quarantine receipts and restore proposals;
- an additive persistence contract for a later schema phase.

The layer does not own a writer. A passing proposal or revalidation result is evidence for a future authorized service, not permission to write.

### Immutable manifest

`buildGeneratedMediaQuarantineManifest()` sorts targets by durable Media ID, then hashes the canonical manifest body. Object keys are sorted recursively; array order is preserved because it is semantic. Non-finite numbers, `undefined`, functions, symbols, bigints, and non-plain objects are refused. The resulting object graph is deeply frozen.

Every target binds:

- durable Media ID;
- explicit job, attempt, contract, and semantic-slot lineage;
- content SHA-256 and storage fingerprint;
- relationship and evidence fingerprints;
- retention-policy decision and proposal reason;
- hold snapshot and proposed recovery deadline.

The batch binds target count, ordered target IDs, policy/profile versions, proposal source, runtime commit, creation and expiry timestamps, relationship-fingerprint version, and the canonical manifest hash. It never carries an authorization bit set to true.

### Relationship and evidence fingerprints

Historical fingerprint V1 is preserved as `generated-media-relationship-fingerprint/v1`. Current fingerprint V2 is domain-separated as `generated-media-relationship-fingerprint/v2` and hashes both normalized relationship collections and the complete normalized contradiction-gate evidence. V1 and V2 cannot compare as the same domain. Any cleanup-critical relationship, workflow, hold, lineage, object-state, or evidence-capture change changes the V2 hash.

Manifest V1 remains historical. The current manifest is V2 because the old manifest did not pin a relationship-fingerprint version and its eligibility semantics did not include the independent contradiction gate. Each V2 target explicitly stores the fingerprint version, and the manifest hash binds that field. Reusing manifest V1 would have made old and new safety semantics indistinguishable.

Evidence fingerprints bind the exact Media metadata, explicit lineage, retention decision, holds, fingerprint V2, raw evidence, derived contradiction-gate evidence, and observed storage facts. Any target-set, content, storage, relationship, evidence, hold, policy, expiry, or eligibility drift fails revalidation.

The fingerprints are fail closed. They are not proof that an object is unused, and they cannot replace a current authoritative relationship read immediately before a future mutation.

### Legacy Evidence Bridge

`bridgeLegacyGeneratedMediaEvidence()` copies only explicit persisted lineage. An observed job relationship is retained separately as evidence; it is never promoted into missing `jobId`, `attemptId`, or `slotId` fields. Positional order, filenames, historical job arrays, or related records never invent semantic lineage. Any incomplete lineage is classified `manual_review_required` with the exact missing fields.

### Holds and revalidation

Proposal construction requires all of the following:

- Media is explicitly `generated`;
- content SHA-256 and storage fingerprint are present and valid;
- explicit job/attempt/slot/contract lineage is complete;
- the retention classifier currently returns `proposal_candidate`;
- no business, gallery, public, Shopier, order/campaign, QC, active-job, pending-decision, recent-activity, recovery-window, smoke, failure, regression, legal/audit, operator, or legacy-ambiguity hold exists.

Contradiction precedence is fixed:

1. Original or permanent business relationship.
2. Public, published, Shopier, order, or campaign use.
3. Gallery or approved use.
4. Active/queued/generating job or pending operator decision.
5. Evidence, operator, legal, audit, Image QC, or business-asset hold.
6. Missing/conflicting lineage, ambiguous object state, or stale evidence capture.
7. Retention-window eligibility only after all earlier gates pass.

`revalidateGeneratedMediaQuarantineManifest()` then compares the stored manifest with a fresh authoritative snapshot and enforces manifest expiry. Even an unchanged, eligible result returns `quarantineAuthorization=false` and `mutationPermission=false`.

### Restore contract

Restore proposals require a matching quarantine receipt, an unexpired recovery deadline, a present Blob, matching content/storage fingerprints, and no blocking restore hold. A passing result remains `restoreAuthorization=false` and `mutationPermission=false`. Physical deletion is outside this foundation and remains false on every path.

## Read-only proposal reporter

`scripts/generated-media-quarantine-proposal.ts` reuses the existing retention census transaction and maps each private database-evidence row into the complete pure raw-input contract before reporting aggregate gate outcomes. Unavailable order, campaign, operator/legal/audit, stale-preview, and provider-neutral object facts remain explicit `unknown`/`ambiguous`; they are never converted to false. It requires:

- literal `--confirm-read-only`;
- exact `PAYLOAD_DB_PUSH=false`;
- the existing verified `READ ONLY` PostgreSQL transaction;
- fixed SELECT-only reads and unconditional rollback.

Mutation-like arguments are refused. The composed reporter uses fixed SELECT-only reads, verifies a read-only transaction, and ends with `ROLLBACK`. It materializes zero production manifests and zero batches because production does not yet persist authoritative content SHA-256, quarantine state, or complete relationship/evidence snapshots. It reports proposal and contradiction-gate counts, not permissions.

## Additive schema contract and rollout plan

`GENERATED_MEDIA_QUARANTINE_SCHEMA_CONTRACT` describes a future expand-only persistence layer:

1. Add nullable lifecycle, hold, content-hash, storage-fingerprint, versioned relationship-fingerprint, evidence-fingerprint, proposal/authorization/expiry/invalidation, quarantine/restore status, quarantine-receipt, and recovery-deadline fields without hooks or defaults that authorize action.
2. Add immutable quarantine-batch, batch-item, and retention-event records. Authorization fields default false and cannot be inferred from status.
3. Rehearse exact SQL and rollback on a disposable non-production PostgreSQL target.
4. Apply production expansion only under a separate operator-approved migration goal with runtime writers still disabled.
5. Deploy read projections and compare fingerprints before enabling any proposal writer.
6. Require a separately authorized, exact-manifest, exact-target quarantine operation and a distinct restore drill.
7. Design physical deletion only after quarantine retention and restore evidence exist; it must use a separate authorization contract.

This goal intentionally does not add Payload collections, hooks, migrations, DDL, backfills, cron, or workers. Current production therefore cannot represent an accidentally authorized quarantine state.

## Production read-only refresh

At `2026-07-28T21:27:55.703293Z`, a single Neon SQL Editor transaction began with `BEGIN TRANSACTION READ ONLY`, verified `transaction_read_only=on`, ran aggregate SELECTs, and ended with `ROLLBACK`.

| Measure | Refreshed value |
|---|---:|
| Generated Media | 527 |
| Image-generation jobs | 127 |
| Jobs represented by generated Media | 119 |
| Jobs with zero Media | 8 |
| Estimated bytes | 106,666,309 (101.73 MiB) |
| Permanent business assets | 174 |
| Pending operator decision | 203 |
| Legacy manual review | 136 |
| Failure evidence | 9 |
| Smoke evidence | 5 |
| Missing job lineage | 513 |
| Missing attempt lineage | 513 |
| Missing slot lineage | 513 |
| Quarantine-proposal candidates | 0 |
| Physical-cleanup candidates | 0 |
| Physical-delete authorizations | 0 |
| Quarantine schema tables | 0 |
| Quarantine schema columns | 0 |
| Accidentally quarantine-authorized records | 0 |

The figures match the previous boundary. Forty-four preview/review jobs and 208 Media remain pending decision; this is retention evidence, not authority to reconcile them.

## Deterministic validation

`npm run test:generated-media-quarantine` runs 56 contract tests plus static governance. Coverage includes:

- canonical serialization and repeatable SHA-256;
- set-like relationship normalization;
- no legacy lineage inference;
- deterministic ordering and immutability;
- originals refused;
- all required relationship, publishing, business, job, preview, hold, lineage, Blob, and evidence-change contradictions;
- deterministic contradiction precedence and explicit unknown-state failure;
- V1/V2 fingerprint separation, material-evidence hash changes, and manifest V2 pinning;
- incomplete lineage, missing hashes, and holds fail closed;
- unchanged revalidation still grants no authorization;
- manifest, target, content, storage, relationship, evidence, eligibility, hold, and expiry drift failures with `evidence_changed_reauthorize`;
- restore proposal checks without restore permission;
- additive schema defaults and the no-production-apply boundary;
- reporter confirmation, read-only transaction, rollback, forbidden-client, and package-script governance.

The quarantine tests are included in `pretest:safe`; the production reporter is deliberately excluded from `test:safe`.

## Technical debt and decisions required

- Production Media has no authoritative content SHA-256 or durable storage fingerprint.
- Lifecycle, hold, decision timestamps, relationship snapshots, quarantine receipts, immutable events, recovery deadlines, and tombstones are not persisted.
- Historical Media has incomplete explicit lineage on 513 of 527 records; the bridge correctly refuses inference.
- Forty-four stale preview/review jobs still need exact operator decisions before any retention clock can begin.
- Blob existence is currently a metadata-level signal; a future proposal service needs bounded provider-neutral object verification.
- Quarantine visibility semantics, restore SLA, operator roles, manifest cooldown, evidence-release ownership, and dual-control physical deletion remain operator decisions.
- Proposal construction currently has no production persistence or writer by design.
- Order/campaign dependencies, operator/legal/audit holds, stale-preview age, and provider-neutral Blob verification remain unknown in the current read projection; the new gate therefore excludes them rather than guessing.

## Recommended next implementation order

1. Decide operator roles, hold-release evidence, quarantine visibility, recovery deadlines, and exact-manifest authorization policy.
2. Produce `GENERATED MEDIA QUARANTINE SCHEMA MIGRATION AND NON-PRODUCTION REHEARSAL V1` for the additive contract only.
3. Apply the additive production schema under a separate guarded expansion goal, with all writers disabled.
4. Add read-only projections and fingerprint comparison against the expanded schema.
5. Run one exact, reversible non-production quarantine-and-restore drill.
6. Only then design a production quarantine writer and operator UX; physical deletion remains a later, separately authorized subsystem.

## Final classification

`GENERATED_MEDIA_RECOVERABLE_QUARANTINE_FOUNDATION_V1_PASS`

Exact next task: **GENERATED MEDIA QUARANTINE SCHEMA MIGRATION AND NON-PRODUCTION REHEARSAL V1**.
