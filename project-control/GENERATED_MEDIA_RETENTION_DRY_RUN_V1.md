# Generated Media Retention Dry Run V1

Classification: `GENERATED_MEDIA_RETENTION_POLICY_PASS_WITH_LEGACY_MANUAL_REVIEW`

Policy: `generated-media-retention/v1`

Census timestamp: 2026-07-28T19:12:59.314Z

Production runtime commit observed: `e0b60f6c83f6fa6d59dd6647558eca6883acb341`

Profile used for deterministic dates: Balanced proposal, not approved or enforced

## Safety proof

The census used authenticated production metadata in explicit `BEGIN TRANSACTION READ ONLY` sessions followed by `ROLLBACK`. No Payload mutation runtime was initialized. No binary was read or downloaded. File presence was assessed only from existing Media filename/URL/positive-size metadata and is not treated as Blob deletion proof. No credential, URI, hostname, Telegram identifier, customer data, raw provider response, or production record detail is included here.

**READ-ONLY CENSUS ONLY. NO MEDIA, BLOB, JOB, PRODUCT, GALLERY, SCHEMA, PROVIDER, TELEGRAM, SHOPIER, PUBLISHING, OR DEPLOYMENT MUTATION OCCURRED.**

## Schema/runtime boundary

- all four additive generated-Media lineage columns are present;
- V1 attempt/slot metadata is present only on the newest 14 generated Media; 513 generated Media predate complete lineage;
- no Media lifecycle, retention-state, hold, quarantine, restore, cleanup-batch, receipt, or tombstone fields exist;
- no generated-Media physical-cleanup authorization path exists;
- the current runtime commit remained unchanged during the census.

## Production census

| Measure | Count / estimate |
| --- | ---: |
| generated Media | 527 |
| image-generation jobs | 127 |
| jobs represented by generated Media | 119 |
| jobs producing no current/lineage Media | 8 |
| generated storage metadata total | 106,666,309 bytes (101.73 MiB) |
| missing complete job/attempt/slot lineage | 513 |
| object metadata incomplete | 0 |
| suspected product-and-job orphan | 0 |
| quarantine proposal candidates | 0 |
| physical-cleanup candidates | 0 |
| physical-delete authorizations | 0 |

## Lifecycle and retention classes

| Lifecycle | Count | Retention class | Count | Approx. bytes |
| --- | ---: | --- | ---: | ---: |
| `approved_attached` | 170 | `PERMANENT_BUSINESS_ASSET` | 174 | 31,984,165 (30.50 MiB) |
| `approved_unattached` | 4 | `PENDING_OPERATOR_DECISION` | 203 | 42,659,008 (40.68 MiB) |
| `preview_pending` | 203 | `LEGACY_MANUAL_REVIEW` | 136 | 26,365,675 (25.14 MiB) |
| `legacy_unclassified` | 136 | `FAILURE_EVIDENCE` | 9 | 4,567,837 (4.36 MiB) |
| `failure_evidence` | 9 | `SMOKE_EVIDENCE` | 5 | 1,089,624 (1.04 MiB) |
| `smoke_evidence` | 5 |  |  |  |

No current generated Media qualified as `REJECTED_RECOVERABLE`, `SUPERSEDED_RECOVERABLE`, `ORPHAN_REVIEW`, or `PHYSICAL_CLEANUP_CANDIDATE`. Every apparent terminal legacy output lacks the durable evidence needed for automatic classification, and the two V1 rejected cohorts are explicitly held as smoke/failure evidence.

## Holds

| Hold | Count |
| --- | ---: |
| `pending_decision_hold` | 203 |
| `business_asset_hold` | 174 |
| `gallery_hold` | 170 |
| `image_qc_hold` | 167 |
| `legacy_ambiguity_hold` | 136 |
| `public_or_published_hold` | 110 |
| `shopier_hold` | 98 |
| `failure_evidence_hold` | 9 |
| `smoke_evidence_hold` | 5 |

Counts overlap because one Media may carry multiple independent holds.

## Reason distribution

| Reason | Count |
| --- | ---: |
| `PHYSICAL_DELETE_NEVER_AUTHORIZED_BY_CLASSIFIER` | 527 |
| `MISSING_JOB_ID` / `MISSING_ATTEMPT_ID` / `MISSING_SLOT_ID` / `LEGACY_LINEAGE_AMBIGUOUS` | 513 each |
| `PENDING_OPERATOR_DECISION` | 203 |
| `GALLERY_REFERENCE` | 170 |
| `IMAGE_QC_DEPENDENCY` | 167 |
| `APPROVED_BUSINESS_ASSET` | 174 |
| `PUBLIC_OR_PUBLISHED_REFERENCE` | 110 |
| `SHOPIER_OR_EXTERNAL_REFERENCE` | 98 |
| `JOB_RECORD_MISSING` | 25 |
| `FAILURE_EVIDENCE` | 9 |
| `SMOKE_EVIDENCE` | 5 |

## Age bands

| Age at census | Generated Media |
| --- | ---: |
| 0-6 days | 24 |
| 7-29 days | 293 |
| 30-89 days | 210 |
| 90-179 days | 0 |
| 180+ days | 0 |

Age alone never grants eligibility.

## Known-cohort reconciliation

- Job 428: terminal `rejected`; one completed `image-slot-contract/v1` attempt; all five requested semantic slots persisted and remain linked by exact lineage; 5 Media; no gallery/public relationship; 1,089,624 bytes. Classified `SMOKE_EVIDENCE`.
- Job 425: terminal `rejected`; one partial V1 attempt; `side` is `provider_failed`; `hero_3q`, `top`, `back`, and `detail` persisted with exact lineage; 4 Media; no gallery/public relationship; 2,694,997 bytes. Classified `FAILURE_EVIDENCE`.
- Job 426: terminal `failed`; one failed V1 attempt; all five requested semantic slots are `skipped`; 0 Media. It contributes job evidence but no cleanup candidate.
- Product 406 failure cohort: Job 378 remains `preview`; 5 legacy generated Media; no gallery/public relationship; 1,872,840 bytes; no V1 slot lineage. Classified `FAILURE_EVIDENCE`, not pending cleanup.
- stale previews: exactly 44 preview/review jobs and 208 generated Media. The prior split is preserved: 203 Media are `PENDING_OPERATOR_DECISION`; the 5 Product 406 outputs are `FAILURE_EVIDENCE`. No stale preview has been reconciled or cleared.

## Ambiguity and candidate outcome

The classifier returned 136 `LEGACY_MANUAL_REVIEW` Media. The broader missing-lineage count is 513 because approved business assets and pending previews remain held by stronger operational facts even when lineage is legacy. There are zero suspected Media with neither product nor job relationship and zero incomplete object-metadata rows.

Proposed recoverable-quarantine population: **0**.

Proposed physical-cleanup population: **0**.

Authorized physical-cleanup population: **0**.

The result is a valid policy pass with legacy manual review, not a cleanup approval.
