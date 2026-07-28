# Generated Media Retention and Recoverable Cleanup Policy V1

Status: canonical policy foundation; no cleanup runtime is enabled

Policy version: `generated-media-retention/v1`

Recommended profile: Balanced, pending explicit approval of every numeric duration

Authoritative production census: `GENERATED_MEDIA_RETENTION_DRY_RUN_V1.md`

## Scope and safety boundary

This policy governs AI-generated Payload Media from creation through preview, operator decision, business use, evidence retention, recoverable quarantine, and a separately authorized future physical cleanup. Original product Media is identity evidence and is never eligible under this policy.

V1 is non-destructive. It adds a pure classifier, deterministic tests, and a direct-Postgres read-only reporter. It does not add fields, hooks, cron, workers, Telegram controls, Blob calls, Payload writes, quarantine, restore, detachment, or deletion. A candidate is a proposal, never authorization.

## Current implementation characterization

| Trigger | Job / attempt / slot | Media and relationships | External state | Current cleanup / recovery gap |
| --- | --- | --- | --- | --- |
| provider fails before output | job continues or fails; exact slot is `provider_failed` in V1 | no Media for that slot | none | attempt evidence exists only in job JSON; no normalized retention record |
| Media save fails | exact slot is `media_save_failed`; complete/partial attempt derived from all slots | failed slot has no Media; other persisted slots remain exact | preview excludes failed save | no durable cleanup lifecycle; partial result remains evidence |
| complete preview | job `preview`; attempt `completed`; five `persisted` slots | five generated Media linked to product and job, not gallery | Telegram album/keyboard sent | delivery receipts are not durable; preview may become stale |
| partial preview | job `preview`; attempt `partial` | only persisted slots become Media; semantic positions remain exact in V1 | Telegram receives persisted subset | partial evidence has no explicit per-Media decision/retention state |
| full approval | job `approved` | current job Media appended to `generativeGallery` | eligible only after Image QC and downstream gates | generated Media has no lifecycle/hold fields |
| partial approval | job `approved`; selected IDs retained as current job relation | selected Media attach to gallery; unselected Media remain stored/product-linked but leave the current job relation | only selected assets may progress | unselected decision is not durably stored per Media |
| rejection | job `rejected`; product visual state rejected | generated Media and lineage remain; gallery unchanged | no publishing | comments anticipate later manual/cron cleanup, but none is governed or recoverable |
| regeneration | same job reset to `queued`; new immutable V1 attempt | current `generatedImages` relation is cleared; old Media remains | new preview later supersedes operator view | earlier legacy/current-job relationships can become incomplete; no supersession record |
| later accepted attempt | job ultimately approved | accepted outputs attach; older outputs remain unless separately handled | normal downstream gates apply | accepted replacement is not a normalized proof on older Media |
| product deletion | product hook nulls `media.product` | Media is retained rather than deleted | no automatic external cleanup | Media can become relationship-ambiguous |
| job deletion | no retention-specific hook | database relationship behavior applies; Blob is not a job relationship | none | no immutable evidence/tombstone guarantee |
| Media deletion | Payload/storage plugin behavior owns record/object deletion | repository has no retention preflight, exact manifest, quarantine, restore, or receipt layer | potentially irreversible | V1 deliberately exposes no deletion path |

Documentation/runtime drift: the target blueprint already requires recoverable quarantine and tombstones, while current runtime has only job status, attempt JSON, Media lineage, and gallery relations. Telegram delivery evidence is transient. Regeneration reuses a job and clears its current relation. Image QC is product-level rather than immutable generated-asset-level. V1 records this drift; it does not change behavior.

## Five independent state dimensions

- Logical state: what the output means (`preview_pending`, `approved_attached`, `rejected`, `failure_evidence`, and similar).
- Relationship state: product, job, attempt, slot, gallery, storefront, Shopier, dispatch, order, campaign, or no proven reference.
- Retention state: permanent, pending decision, recovery window, held, quarantine proposal, quarantined, or later cleanup candidate.
- Physical state: object metadata present, object confirmed present, missing, quarantined-but-retained, removed, or unknown.
- Evidence state: ordinary, smoke, failure, regression, legal/audit, operator-held, or released with proof.

These dimensions must never be collapsed into job status. `rejected` is an operator decision, not deletion eligibility; `failed` may be valuable evidence; object absence requires reconciliation, not record deletion.

## Canonical lifecycle

V1 uses the minimum operational classifications: `original_asset`, `approved_attached`, `approved_unattached`, `preview_pending`, `rejected`, `partially_approved_unselected`, `superseded`, `failure_evidence`, `smoke_evidence`, `orphan_suspected`, `reconciliation_required`, and `legacy_unclassified`.

Future persisted retention states are separate: `quarantine_eligible`, `quarantined_recoverable`, `physical_cleanup_eligible`, `physically_removed`, and `tombstoned`. `manual_hold` is represented by holds rather than a competing lifecycle state.

Allowed conceptual progression:

`generated -> preview_pending -> approved_attached | approved_unattached | rejected | partially_approved_unselected`

`rejected | partially_approved_unselected | superseded -> recovery window -> exact quarantine proposal -> quarantined_recoverable -> grace window -> exact physical-cleanup candidate -> separately approved cleanup -> tombstoned`

At every arrow, newly discovered business use, pending work, ambiguity, evidence purpose, or recent relationship activity stops the clock and reclassifies fail closed.

## Retention classes

- `PERMANENT_BUSINESS_ASSET`: original, approved, gallery, storefront/public, externally published, Shopier, order, or active-campaign asset. Never automatic cleanup eligible.
- `PENDING_OPERATOR_DECISION`: preview/review or ambiguous stale preview. No expiry; reconcile first.
- `REJECTED_RECOVERABLE`: explicit rejection, complete lineage, no business use. Recovery window precedes even a quarantine proposal.
- `SUPERSEDED_RECOVERABLE`: older output with proof of a newer accepted attempt and no remaining use.
- `FAILURE_EVIDENCE`: partial defects, known visual failures, save/provider diagnosis, or regression reproduction.
- `SMOKE_EVIDENCE`: controlled production proof such as Job 428.
- `ORPHAN_REVIEW`: suspected relationship loss; investigation only.
- `LEGACY_MANUAL_REVIEW`: missing/ambiguous lineage or missing job evidence; indefinite manual review.
- `PHYSICAL_CLEANUP_CANDIDATE`: already quarantined, grace elapsed, complete proof, no holds. Still not authorization.

## Hold model

| Hold | Add/remove authority and evidence | Clock effect |
| --- | --- | --- |
| `operator_hold` | authorized operator; exact asset/reason/timestamp; same or stronger operator removes | pauses all clocks |
| `business_asset_hold` | derived from approved/order/campaign use; owning workflow plus operator proves release | indefinite |
| `gallery_hold` | derived from gallery relationship; exact relationship removal and snapshot required | indefinite |
| `public_or_published_hold` | derived from storefront/publishing evidence; channel reconciliation required | indefinite |
| `shopier_hold` | derived from Shopier use; Shopier/business reconciliation required | indefinite |
| `image_qc_hold` | image owner/operator; asset-level QC dependency and release proof | pauses |
| `smoke_evidence_hold` | engineering owner plus operator; explicit evidence-release record | indefinite until release |
| `failure_evidence_hold` | issue owner plus operator; issue closure and reproduction replacement | then evidence window starts |
| `regression_fixture_hold` | test/evaluation owner; replacement fixture and audit | indefinite until release |
| `legal_or_audit_hold` | authorized compliance/operator decision; immutable reason | overrides every cleanup path |
| `legacy_ambiguity_hold` | classifier; complete lineage/relationship reconciliation removes | no clock |
| `active_job_hold` | derived from queued/generating job; terminal proof removes | no clock while active |
| `pending_decision_hold` | derived from preview/review; exact operator decision removes | no automatic expiry |
| `recent_activity_hold` | derived from relationship/record activity | resets to latest relevant event |
| `recovery_window_hold` | derived from policy clock | ends only when approved duration elapses |

Every future persisted hold needs `holdType`, target, added/removed timestamps, reason code, actor/authorization tier, evidence reference, policy version, and audit event. One active hold makes physical cleanup ineligible.

## Proposed profiles and windows

All numbers are proposals and require explicit operator approval before enforcement.

| Profile | rejected recovery | superseded recovery | orphan review | quarantine grace | recent-activity reset |
| --- | ---: | ---: | ---: | ---: | ---: |
| Conservative | 180 days | 120 days | 90 days | 90 days | 30 days |
| Balanced | 90 days | 60 days | 60 days | 60 days | 14 days |
| Aggressive | 30 days | 14 days | 30 days | 30 days | 7 days |

Balanced is recommended after schema and restore foundations exist. It materially limits storage growth while preserving a three-month rejection recovery period and two-phase recovery. Until approval and implementation, runtime behavior remains conservative: no automated expiry and no physical cleanup.

Clock rules:

- approved/current/public/business assets: indefinite; no clock.
- pending decisions and legacy ambiguity: no clock.
- rejected: starts at durable rejection decision; later relationship/activity resets it.
- superseded: starts only when a replacement attempt is durably accepted; activity resets it.
- failure evidence: starts only after explicit issue closure and evidence release; use the rejected window unless separately approved.
- smoke/regression/legal evidence: starts only after explicit release.
- orphan: review clock may prioritize investigation but never grants deletion.
- physical cleanup: starts only from successful quarantine receipt, not original creation or rejection.
- holds pause eligibility; relationship-changing events reset the applicable clock to the latest event.

## Two-phase recoverable cleanup

### Phase A: recoverable quarantine

An exact immutable proposal is revalidated, then an authorized apply marks retention state so the asset is excluded from normal operator selection while retaining Media record, Blob, product/job/attempt/slot lineage, prior relationships, reason, batch, operator evidence, and restoration deadline. V1 does not implement this.

### Phase B: physical cleanup

Only an already quarantined asset can become a candidate after grace. Final revalidation requires no hold, job, gallery, original, public, publishing, Shopier, business, or pending relationship; complete lineage; confirmed object state; immutable manifest approval; understood restore boundary; and a fresh relationship snapshot.

Failure handling must be resumable and receipt-driven:

- Blob removed but record finalization fails: retain tombstone/receipt, mark partial failure, retry metadata finalization; never pretend recoverable.
- record/tombstone persisted but Blob removal fails: keep quarantined, record failure, retry object step.
- relationship changes during batch: optimistic version/hash check fails that asset closed.
- object already missing: stop normal deletion and enter reconciliation.
- partial batch: each asset has an independent step receipt; retry only incomplete exact entries.
- rollback before Blob removal: restore quarantine state from manifest. After confirmed Blob removal, recovery depends on an external retained backup; never promise restore without it.

## Tombstone, receipt, and schema implications

The existing Media schema cannot safely persist lifecycle state, holds, quarantine/restore metadata, relationship snapshots, immutable manifests, step receipts, or tombstones. `altText` and captions must not carry machine metadata. A future additive design should preserve:

- original Media ID and product/job/attempt/slot snapshot;
- content hash, filename, byte size, MIME, dimensions, storage locator digest (not a credential-bearing URI);
- lifecycle/retention reason and policy version;
- hold snapshot and release evidence;
- quarantine, recovery deadline, approval, deletion attempt/result, and tombstone timestamps;
- actor tier, exact manifest hash, prior relationship snapshot, and per-step idempotency key.

Prefer separate immutable `GeneratedMediaRetentionEvents` and `GeneratedMediaCleanupBatches`/receipts, plus minimal current-state fields on Media. Physical removal should retain a tombstone record or separate receipt; do not hard-delete the only lineage evidence.

## Authorization and immutable batch manifest

1. Read-only dry run: one authorized operator or scheduled diagnostic; no mutation.
2. Quarantine proposal: prepares exact IDs, evidence, holds, intended transitions, and hash; no mutation.
3. Quarantine apply: one authorized operator plus exact manifest hash and cooldown; reversible and independently logged.
4. Restore: one authorized operator bound to exact asset/batch and recovery deadline.
5. Physical cleanup: two authorized operators, exact immutable manifest hash, cooldown, and final revalidation. Neither operator may approve a changed manifest.

The manifest must include policy/schema/runtime versions, generated timestamp, target Media/object identities, content hashes and sizes, lineage and relationship snapshots, class/holds/reasons, recovery dates, intended operations, per-asset preconditions, actor approvals, and overall SHA-256. Wildcards such as “all rejected” or “old orphans” are invalid.

## Pure policy engine

`src/lib/generatedMediaRetentionPolicy.ts` accepts normalized evidence and returns lifecycle, retention class, holds, eligibility, reasons, missing evidence, deterministic UTC dates, manual-review requirement, and one safe next action. It performs no I/O and exposes `physicalDeleteAuthorization: false` on every path. `scripts/generated-media-retention-dry-run.ts` uses fixed SELECTs inside a verified direct-Postgres read-only transaction and always rolls back; it imports neither Payload nor Blob/Telegram/provider clients.

## Operator decisions still required

- approve or change all five numeric durations in one profile;
- decide whether failure evidence uses the rejected window or a longer dedicated window after issue closure;
- nominate owners allowed to release smoke, failure, regression, and legal/audit holds;
- approve lifecycle/hold/event/batch/tombstone schema design;
- approve quarantine visibility semantics in Payload and Telegram;
- approve restore guarantees and whether retained object versioning/backup is required;
- approve one-operator-plus-hash quarantine and two-operator-plus-hash physical cleanup;
- decide whether an asset-level Image QC relationship is required before lifecycle implementation.

## Implementation roadmap

| Phase | Dependencies / schema | Runtime and validation | Rollback / approval gate |
| --- | --- | --- | --- |
| 1. policy and dry run | none | pure classifier, read-only reporter, deterministic tests | this checkpoint; no deploy needed |
| 2. lifecycle/hold contract | approved additive model | current-state projection plus immutable events | expand-only migration; schema approval |
| 3. recoverable quarantine | phase 2 | exact transition service; no Blob removal | restore state; exact-batch approval |
| 4. manifest/hash | phase 2 | canonical serialization and SHA-256 | manifests immutable; operator approval |
| 5. restore workflow | phases 3-4 | exact restore with relationship checks | revert quarantine; exact target approval |
| 6. operator UX | phases 3-5 | Telegram/Payload preview, holds, receipts | feature flag; operator UX approval |
| 7. physical worker | phases 3-6 | idempotent object step behind exact manifest | disabled by default; two-operator gate |
| 8. tombstone/receipt | phases 2,4,7 | durable per-step evidence | additive persistence; audit approval |
| 9. historical backfill | stable schema | ambiguity-preserving metadata only | batch rollback; exact cohort approval |
| 10. comparison dry runs | phase 9 | old/new report comparison | no mutation; evidence review |
| 11. first quarantine | all prior | tiny exact batch and restore drill | cooldown and explicit manifest approval |
| 12. first physical cleanup | proven quarantine/grace/restore | tiny exact batch, final preflight, receipts | two operators; separate production authorization |

No phase authorizes prompt, camera, slot, provider, visual-quality, product, publishing, or protected-brand behavior changes.
