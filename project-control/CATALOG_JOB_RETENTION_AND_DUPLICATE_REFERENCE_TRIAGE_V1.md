# Catalog Job Retention and Duplicate Reference Triage V1

Date: 2026-07-28
Primary result: `CATALOG_JOB_TRIAGE_PASS_WITH_MANUAL_REVIEW_REMAINDER`

## Authorization boundary

This checkpoint is a read-only production evidence audit. It did not approve, reject, regenerate, cancel, clear, create, or queue an image job; change a Product or Media record; invoke Telegram, Gemini, OpenAI, Shopier, publishing, or advertising; change schema; push; or deploy. Production queries ran inside explicit `BEGIN READ ONLY` transactions and excluded customer-sensitive content, Telegram identifiers, credentials, connection strings, and raw provider output.

The only tracked changes are this operational evidence document and the smallest Source Pack synchronization. Local ignored scripts and contact sheets were used to reduce production evidence to non-sensitive counts, identifiers, hashes, and visual classifications.

## Repository and production preflight

- Canonical checkout: `C:\Users\W11\Desktop\uygunayakkabi-store`
- Branch and HEAD: `main` at `747a3b23c1920f76d21d047bca19598a7c0e0ecc`
- Refreshed `origin/main`: `e0b60f6c83f6fa6d59dd6647558eca6883acb341`
- Relation: 2 ahead, 0 behind; clean worktree; no merge, rebase, cherry-pick, revert, or bisect
- Backup branch: `codex/backup-main-pre-governance-20260726-8a9cfcb` remains at `8a9cfcb1619e536dd53d4a9028f76ead65c8a0fb`
- Retained stashes remain `f25b28a243bf219b1702df83ab6f8e93684ca17e` and `0d4b28ce106826fd9d42a48050f48baf75f61647`
- Vercel production deployment `dpl_EtChj9RhyqpAuy3M7C18BdX24Mnz` is `READY` and owns `www.uygunayakkabi.com`, the apex, and the production aliases. The current deployment identity matches the prior exact remote-Git evidence for commit `e0b60f6c83f6fa6d59dd6647558eca6883acb341`.
- Authenticated Payload Admin and the public storefront render normally. Production error, fatal, and 5xx log queries over the preflight window returned no entries.
- Current Vercel environment metadata still includes Production `PAYLOAD_DB_PUSH`; the secret-safe production snapshot verifies its exact value is `false`.
- Production remains `ALL_SEVEN_COLUMNS_PRESENT_COMPATIBLE`: three nullable ImageGenerationJob fields (`varchar`, `varchar`, `jsonb`) and four nullable Media lineage `varchar` fields match `image-slot-contract/v1`.
- No Vercel deployment/build, local deploy/build/migration/smoke, database DDL/migration session, active Payload job worker, queued/generating ImageGenerationJob, provider smoke, or Telegram smoke was observed.

The database contains 126 image jobs: 46 approved, 29 rejected, 7 failed, and 44 preview. All 29 retained Payload execution rows have `processing=false`. Twenty-three old image execution rows have no `completedAt`, but none is linked to the 44 preview jobs and none is processing; they are historical queue-record debt, not live workers.

## Evidence-based age thresholds

All 126 image jobs have start/completion timing. Generation duration is 91 seconds at P50, 117 at P90, 124 at P95, 133 at P99, and 174 seconds maximum. Terminal job lifecycle duration is 30.8 hours at P95 and 52.3 hours maximum. The scheduled runner interval is 30 minutes.

The triage thresholds are therefore:

- `GENUINELY_ACTIVE`: processing execution, or an executable queue row updated within the current run window.
- `STALE_QUEUED_OR_GENERATING`: no worker plus age greater than 45 minutes. This covers the 30-minute scheduler interval with more than six times the observed P99 generation duration.
- `AWAITING_OPERATOR_REVIEW`: preview has durable delivery evidence and is no older than 72 hours.
- `STALE_PREVIEW`: older than 72 hours, or no durable Telegram delivery/keyboard evidence. The 72-hour window exceeds the observed 52.3-hour maximum terminal decision lifecycle and is intentionally conservative.

No arbitrary threshold is used to infer deletion eligibility. Retention remains a separate policy decision.

## Product 406 first

Product 406 is `SN0073`, SKU `TG-1783002483600`, title `@hermentix_bot`. It is a non-public, non-sellable draft with workflow `visual_pending`, visual status `preview`, confirmation `pending`, Image QC `pending`, publish `not_requested`, no Shopier/publishing history, no variants, orders, inquiries, Product Intelligence reports, or Bot Events, and no generated gallery attachment.

Its single original relationship is Media 1657: original JPEG, 20,665 bytes, 743x116. HTTP access is healthy, but visual inspection proves it is a cropped terminal/tooling screenshot and contains no shoe. It is not part of the 13 duplicate groups.

Its only image job is job 378:

- created `2026-07-02T14:28:07.698Z`; last updated `2026-07-02T14:29:50.129Z`
- generation `2026-07-02T14:28:11.208Z` to `2026-07-02T14:29:49.754Z` (98.546 seconds)
- status `preview`, mode `hizli`, provider `gemini-pro`, stage `standard`
- historical request: five standard positions; five generated Media rows
- no `image-slot-contract/v1`, `activeAttemptId`, attempt record, semantic slot record, or Media lineage because the job predates the deployed foundation
- generated Media 1658-1662, each 2048x2048 JPEG, related to job 378 in legacy order, none in `generativeGallery`
- the five outputs are visually coherent invented tan/brown shoes, but they have no identity relationship to the terminal screenshot. They are unusable as product truth.
- Telegram chat/request context exists, but preview album/keyboard message IDs and send success are not persisted. Current code can set `preview` even when Telegram delivery fails, so status alone is not delivery proof.
- no Payload execution row, active worker, queue row, provider activity, callback decision, approval, or publishing dependency exists now
- the current `#gorsel` deduplication rule would still treat this preview as active and block a second job

Primary product-406 job classification: `STALE_PREVIEW`.

Safest future action: preserve original Media 1657 as provenance and preserve job 378 plus Media 1658-1662 as `RETAIN_FAILURE_EVIDENCE`. Under a separate exact mutation authorization, require an explicit rejection of job 378, synchronize product 406 to `visualStatus=rejected`, then archive the draft/homepage visibility state while retaining every job and Media relationship. Do not detach Media 1657: without it the reason the generated shoes are invalid would be destroyed. If the exact old Telegram keyboard cannot be proved available, do not use free-text `reddet`, which selects the most recent preview by chat; use a future exact-ID reconciliation path.

## The 44 active-like products

Shared invariants across all 44:

- exactly one active-like job per product and one historical job per product
- every job status is `preview`; every product is a non-public, non-sellable draft with `visual_pending` / `preview`, confirmation `pending`, and publish `not_requested`
- provider `gemini-pro`, stage `standard`, provider work completed on the job date, and no provider is active now
- six early jobs requested and produced three legacy positions; 38 requested and produced five; total generated Media is 208
- zero V1 attempt IDs, V1 slot records, linked Payload execution rows, active workers, durable preview receipts, gallery attachments, publishing/Shopier dependencies, orders, or inquiries
- semantic persisted/failed/skipped slot counts are unknown rather than guessed; the legacy generated-Media relationship counts are known
- 43 first references are visually valid real-shoe photos; product 406 is the sole invalid terminal screenshot
- 24 products are also members of a duplicate-reference group
- ages range from 4.9 to 55.8 days and all exceed the 72-hour preview threshold

Each row below is therefore category `E — STALE_PREVIEW`. `Pending` means retain the exact job/Media set until a controlled operator decision; `Failure` is the product-406 failure-evidence exception.

| Product / SN / SKU / title | Job / created UTC | Request → Media IDs | Duplicate group / reference | Retention |
| --- | --- | --- | --- | --- |
| 352 / SN0025 / TG-1780441513316 / Taslak Ürün 02/06-4054 | 326 / 2026-06-02 | 3 → 1389-1391 | none / valid shoe | Pending |
| 356 / SN0029 / TG-1780966442448 / Taslak Ürün 09/06-4121 | 330 / 2026-06-09 | 3 → 1405-1407 | none / valid shoe | Pending |
| 357 / SN0030 / TG-1780966670334 / Taslak Ürün 09/06-4128 | 331 / 2026-06-09 | 3 → 1409-1411 | none / valid shoe | Pending |
| 360 / SN0033 / TG-1781372886781 / Taslak Ürün 13/06-4177 | 334 / 2026-06-13 | 3 → 1424-1426 | none / valid shoe | Pending |
| 368 / no SN / TG-1782490992699 / Taslak Ürün 26/06-4260 | 340 / 2026-06-26 | 3 → 1450-1452 | G6 / valid shoe | Pending |
| 369 / SN0039 / TG-1782491376914 / Taslak Ürün 26/06-4274 | 341 / 2026-06-26 | 3 → 1454-1456 | none / valid shoe | Pending |
| 371 / SN0040 / TG-1782591078603 / Taslak Ürün 27/06-4303 | 343 / 2026-06-27 | 5 → 1465-1469 | G7 / valid shoe | Pending |
| 373 / SN0042 / TG-1782593105894 / Taslak Ürün 27/06-4321 | 345 / 2026-06-27 | 5 → 1477-1481 | G7 / valid shoe | Pending |
| 375 / SN0044 / TG-1782596988950 / Taslak Ürün 27/06-4340 | 347 / 2026-06-27 | 5 → 1489-1493 | G9 / valid shoe | Pending |
| 385 / SN0054 / TG-1782657461342 / Taslak Ürün 28/06-4445 | 357 / 2026-06-28 | 5 → 1541-1545 | G7 / valid shoe | Pending |
| 386 / SN0055 / TG-1782670790203 / Taslak Ürün 28/06-4455 | 358 / 2026-06-28 | 5 → 1547-1551 | G10 / valid shoe | Pending |
| 387 / SN0056 / TG-1782671029128 / Taslak Ürün 28/06-4464 | 359 / 2026-06-28 | 5 → 1553-1557 | G6 / valid shoe | Pending |
| 388 / SN0057 / TG-1782672487762 / Taslak Ürün 28/06-4473 | 360 / 2026-06-28 | 5 → 1559-1563 | G6 / valid shoe | Pending |
| 389 / SN0058 / TG-1782679419370 / Taslak Ürün 28/06-4484 | 361 / 2026-06-28 | 5 → 1565-1569 | none / valid shoe | Pending |
| 390 / SN0059 / TG-1782681725857 / Taslak Ürün 28/06-4495 | 362 / 2026-06-28 | 5 → 1571-1575 | none / valid shoe | Pending |
| 391 / SN0060 / TG-1782748972712 / Taslak Ürün 29/06-4506 | 363 / 2026-06-29 | 5 → 1577-1581 | none / valid shoe | Pending |
| 393 / SN0062 / TG-1782802995304 / Taslak Ürün 30/06-4525 | 365 / 2026-06-30 | 5 → 1589-1593 | G6 / valid shoe | Pending |
| 394 / SN0063 / TG-1782804650661 / Taslak Ürün 30/06-4543 | 366 / 2026-06-30 | 5 → 1595-1599 | G6 / valid shoe | Pending |
| 398 / no SN / TG-1782805486836 / Taslak Ürün 30/06-4581 | 370 / 2026-06-30 | 5 → 1621-1625 | G6 / valid shoe | Pending |
| 399 / SN0066 / TG-1782807704729 / Taslak Ürün 30/06-4600 | 371 / 2026-06-30 | 5 → 1627-1631 | G6 / valid shoe | Pending |
| 400 / SN0067 / TG-1782812070588 / Taslak Ürün 30/06-4609 | 372 / 2026-06-30 | 5 → 1633-1637 | none / valid shoe | Pending |
| 406 / SN0073 / TG-1783002483600 / @hermentix_bot | 378 / 2026-07-02 | 5 → 1658-1662 | none / terminal screenshot | Failure |
| 412 / SN0079 / TG-1783046452180 / Taslak Ürün 03/07-4769 | 384 / 2026-07-03 | 5 → 1693-1697 | none / valid shoe | Pending |
| 413 / no SN / TG-1783047507931 / Taslak Ürün 03/07-4795 | 385 / 2026-07-03 | 5 → 1701-1705 | none / valid shoe | Pending |
| 419 / no SN / TG-1783179183287 / Taslak Ürün 04/07-4899 | 391 / 2026-07-04 | 5 → 1740-1744 | none / valid shoe | Pending |
| 420 / no SN / TG-1783179967462 / Taslak Ürün 04/07-4913 | 392 / 2026-07-04 | 5 → 1749-1753 | none / valid shoe | Pending |
| 422 / SN0085 / TG-1783345143427 / Taslak Ürün 06/07-4953 | 394 / 2026-07-06 | 5 → 1761-1765 | none / valid shoe | Pending |
| 425 / SN0088 / TG-1783389847667 / Taslak Ürün 07/07-5006 | 397 / 2026-07-07 | 5 → 1779-1783 | G11 / valid shoe | Pending |
| 426 / SN0089 / TG-1783394636375 / Taslak Ürün 07/07-5015 | 398 / 2026-07-07 | 5 → 1785-1789 | G11 / valid shoe | Pending |
| 427 / SN0090 / TG-1783396335542 / Taslak Ürün 07/07-5024 | 399 / 2026-07-07 | 5 → 1791-1795 | G11 / valid shoe | Pending |
| 428 / SN0091 / TG-1783396628079 / Taslak Ürün 07/07-5033 | 400 / 2026-07-07 | 5 → 1797-1801 | G12 / valid shoe | Pending |
| 429 / SN0092 / TG-1783397562759 / Taslak Ürün 07/07-5042 | 401 / 2026-07-07 | 5 → 1803-1807 | G12 / valid shoe | Pending |
| 430 / SN0093 / TG-1783397837253 / Taslak Ürün 07/07-5051 | 402 / 2026-07-07 | 5 → 1809-1813 | G9 / valid shoe | Pending |
| 431 / SN0094 / TG-1783401346218 / Taslak Ürün 07/07-5060 | 403 / 2026-07-07 | 5 → 1815-1819 | G8 / valid shoe | Pending |
| 432 / SN0095 / TG-1783404208800 / Taslak Ürün 07/07-5069 | 404 / 2026-07-07 | 5 → 1822-1825,1827 | G8 / valid shoe | Pending |
| 433 / SN0096 / TG-1783404217472 / Taslak Ürün 07/07-5071 | 405 / 2026-07-07 | 5 → 1826,1828-1831 | G7 / valid shoe | Pending |
| 434 / SN0097 / TG-1783405035867 / Taslak Ürün 07/07-5085 | 406 / 2026-07-07 | 5 → 1834-1838 | G10 / valid shoe | Pending |
| 435 / SN0098 / TG-1783405096997 / Taslak Ürün 07/07-5088 | 407 / 2026-07-07 | 5 → 1839-1843 | none / valid shoe | Pending |
| 436 / SN0099 / TG-1783405626903 / Taslak Ürün 07/07-5103 | 408 / 2026-07-07 | 5 → 1845-1849 | G5 / valid shoe | Pending |
| 437 / SN0100 / TG-1783406821253 / Taslak Ürün 07/07-5112 | 409 / 2026-07-07 | 5 → 1852-1856 | G5 / valid shoe | Pending |
| 438 / SN0101 / TG-1783406880729 / Taslak Ürün 07/07-5115 | 410 / 2026-07-07 | 5 → 1857-1861 | none / valid shoe | Pending |
| 442 / SN0105 / TG-1784084479068 / Taslak Ürün 15/07-5174 | 414 / 2026-07-15 | 5 → 1881-1885 | none / valid shoe | Pending |
| 443 / SN0106 / TG-1784220507550 / Taslak Ürün 16/07-5183 | 415 / 2026-07-16 | 5 → 1887-1891 | none / valid shoe | Pending |
| 450 / SN0113 / TG-1784840652545 / Taslak Ürün 23/07-5301 | 422 / 2026-07-23 | 5 → 1929-1933 | none / valid shoe | Pending |

Classification totals:

| Category | Count |
| --- | ---: |
| A `GENUINELY_ACTIVE` | 0 |
| B `AWAITING_OPERATOR_REVIEW` | 0 |
| C `TERMINAL_JOB_PRODUCT_STATUS_STUCK` | 0 |
| D `STALE_QUEUED_OR_GENERATING` | 0 |
| E `STALE_PREVIEW` | 44 |
| F `HISTORICAL_EVIDENCE_ONLY` | 0 |
| G `AMBIGUOUS_MANUAL_REVIEW` | 0 |

The 44 are not classified as category B because delivery/keyboard success is not durably stored and every row exceeds the operator-review threshold. They are not category F because each preview still blocks the current dedup guard.

## Retention recommendations

For the scoped 44 job/Media sets:

| Recommendation | Jobs | Generated Media | Reason |
| --- | ---: | ---: | --- |
| `RETAIN_PENDING_OPERATOR_DECISION` | 43 | 203 | Legacy preview is unresolved, relationship is intact, no gallery/publish use exists, and deletion policy is not approved. |
| `RETAIN_FAILURE_EVIDENCE` | 1 | 5 | Product 406 proves an invalid screenshot can produce plausible but invented shoe identity. |
| All other retention categories | 0 | 0 | No scoped output is approved, smoke-proven, superseded by proven lineage, or safely orphaned. |

No `ORPHAN_CLEANUP_CANDIDATE` is asserted: these Media rows remain related to unresolved jobs and lack attempt/slot lineage. After an explicit decision, they should move to `RETAIN_UNTIL_RETENTION_POLICY`, not directly to deletion.

## Thirteen byte-identical original-reference groups

The refreshed HTTP/hash audit again found 13 groups, 54 products, 54 distinct first-reference Media records, and 41 copies beyond one-per-group. Every record is `type=original`, every Product source is Telegram, and all 54 have Telegram intake evidence. No group shares a single Media ID: the storage copies are distinct but byte-identical. Visual review proves all 13 binaries are real shoe photographs; none is a screenshot, placeholder, text image, unrelated content, or Golden Product Set fixture.

Byte identity proves duplicate source bytes, not product equivalence. Groups G1 and G4 remain ambiguous because multiple independently confirmed/published records may represent intentional inventory distinctions. The other 11 contain conclusive repeated-intake records.

| Group / SHA-256 | Products / titles / creation dates | State evidence | Classification | Future recommendation |
| --- | --- | --- | --- | --- |
| G1 / `83bbd0104a9f0908d41d3e13e1a1f9ecabe96b002493fedb457fb22414288c14` | 323/SN0001, 326/SN0002, 327/SN0003, 362/SN0035 — all `New Balance Sneaker Çok Renkli`; 2026-05-08, 05-09, 05-10, 06-19 | all confirmed/approved with galleries and PI/BotEvent evidence; 327 and 362 published | `AMBIGUOUS_REVIEW_REQUIRED` | preserve all; operator must prove variant/inventory intent before any consolidation |
| G2 / `339d27b2231de257a3080e6604c7dacf27754006042ff787d5bc5f17918c0d04` | 328/SN0004 `New Balance 530 Bej`, 331/SN0005 same, 350/SN0023 `New Balance 530 Bej Kahve`, 365/SN0036 draft title; 2026-05-11 to 06-23 | first three confirmed/published; 365 zero-value rejected draft | `ACCIDENTAL_DUPLICATE_INTAKE` | preserve 328/331/350 pending inventory review; archive-review 365; no Media merge |
| G3 / `f0102d4a6199c5fe9df035f0669f60438b9aec7b74f44d9f26eef0b2cac05941` | 332/SN0006 and 335/SN0009 — `Loro Piana`; 2026-05-19 | both confirmed/approved; 335 sold out and published | `ACCIDENTAL_DUPLICATE_INTAKE` | retain 335 as commercial anchor; review 332 for later archive/consolidation |
| G4 / `a3158fc11d588fa9c563ac4447beb0700354cb02a9cc7c85a921779dec8761a6` | 346/SN0020 and 351/SN0024 — `New Balance 9060 Mavi Gri`; 2026-05-31 and 06-02 | both confirmed, approved, published, with independent variants/PI/BotEvents and different prices | `AMBIGUOUS_REVIEW_REQUIRED` | preserve both; operator inventory review, no inferred canonical |
| G5 / `c9b8010b3a0b9d69bcddfc1109e1367ea83e8579c2098ec344e5192621d8b67a` | 367/SN0038 `Asics Sneaker Bej`; 377/SN0046, 436/SN0099, 437/SN0100 draft titles; 2026-06-23 to 07-07 | 367 confirmed/published with gallery and evidence; other three zero-value, two stale previews | `ACCIDENTAL_DUPLICATE_INTAKE` | canonical 367; archive-review 377/436/437 after preview decisions |
| G6 / `1e4e24bb6e0242245b1835738b70cc1de91cd82c9710153746f3477a8f5f23b0` | 368/no SN, 370/no SN, 378/SN0047, 379/SN0048, 380/SN0049, 382/SN0051, 383/SN0052, 384/SN0053, 387/SN0056, 388/SN0057, 392/SN0061, 393/SN0062, 394/SN0063, 395/SN0064, 396/SN0065, 397/no SN, 398/no SN, 399/SN0066 — draft titles; 2026-06-26 to 06-30 | all zero-value/no-business drafts; seven stale previews; 383 uniquely retains four gallery links | `ACCIDENTAL_DUPLICATE_INTAKE` | retain 383 as evidence anchor; archive-review the other 17 after active decisions; preserve all jobs/Media |
| G7 / `e774ae18f2b65585b96e1acb64934e544cbd90dece1605fe72306394955c4d5b` | 371/SN0040, 373/SN0042, 381/SN0050, 385/SN0054, 433/SN0096 — draft titles; 2026-06-27 to 07-07 | zero-value/no-business; four stale previews, one rejected | `ACCIDENTAL_DUPLICATE_INTAKE` | retain earliest 371 as canonical draft; archive-review 373/381/385/433 after decisions |
| G8 / `6e2ff5276873a7da0546fee995a332373ebf75d0225c4f33560752fda6220a00` | 374/SN0043, 431/SN0094, 432/SN0095 — draft titles; 2026-06-27 and 07-07 | zero-value/no-business; 374 rejected, two stale previews | `ACCIDENTAL_DUPLICATE_INTAKE` | retain earliest 374; archive-review 431/432 after decisions |
| G9 / `c25d4d8f7d0e75b7dc068376a1ef5c31d8be4cd4e3acb9abdbd4913956a0c72b` | 375/SN0044 and 430/SN0093 — draft titles; 2026-06-27 and 07-07 | zero-value/no-business; both stale preview | `ACCIDENTAL_DUPLICATE_INTAKE` | retain earliest 375; archive-review 430 after decisions |
| G10 / `5d01c5bedcc91ab53c29d96f838f21d9f60e1c05f3b53741bbf0d3fa72b88245` | 386/SN0055 and 434/SN0097 — draft titles; 2026-06-28 and 07-07 | zero-value/no-business; both stale preview | `ACCIDENTAL_DUPLICATE_INTAKE` | retain earliest 386; archive-review 434 after decisions |
| G11 / `649016c1f6d4099d37edb0152df97986d712d3c773b69c1e8848b430e5a3ae0e` | 410/SN0077 `BOSS Günlük Ayakkabı Bordo`; 425/SN0088, 426/SN0089, 427/SN0090 draft titles; 2026-07-02 to 07-07 | 410 confirmed/approved with five gallery links and evidence; other three zero-value stale previews | `ACCIDENTAL_DUPLICATE_INTAKE` | canonical 410; archive-review 425/426/427 after decisions |
| G12 / `06757a8e74b6679370f7c09301d5eca7f9c276dbecf2d2817cfa3ead0eb3d0d8` | 428/SN0091 and 429/SN0092 — draft titles; 2026-07-07 | zero-value/no-business; both stale preview | `ACCIDENTAL_DUPLICATE_INTAKE` | retain earliest 428; archive-review 429 after decisions |
| G13 / `8937647f25f050373f4f0cbcbf6a86d5b32ba1717b859be2b0b474b55ec86300` | 440/SN0103 `New Balance Sneaker Beyaz`; 441/SN0104 draft title; 2026-07-14 | 440 confirmed/approved with five gallery links and evidence; 441 zero-value rejected draft | `ACCIDENTAL_DUPLICATE_INTAKE` | canonical 440; archive-review 441 |

Duplicate classification totals: 11 `ACCIDENTAL_DUPLICATE_INTAKE`, 2 `AMBIGUOUS_REVIEW_REQUIRED`, and 0 in the other four categories. Product consolidation, Media consolidation, and deletion remain unauthorized and unsafe until the two ambiguous groups and inventory intent are resolved.

## Manual-review reduction

The original 62 manual-review products decompose exactly into the 44 stale-preview population, 40 duplicate-group products, and two no-image products, with overlap between the first two sets.

Evidence now supports these recommendation-only changes:

| Revised recommendation | Count | Exact products |
| --- | ---: | --- |
| `KEEP_DRAFT` | 25 | 352, 356, 357, 360, 369, 371, 374, 375, 383, 386, 389, 390, 391, 400, 412, 413, 419, 420, 422, 428, 435, 438, 442, 443, 450 |
| `QUARANTINE_CANDIDATE` | 35 | 365, 368, 370, 373, 377, 378, 379, 380, 381, 382, 384, 385, 387, 388, 392, 393, 394, 395, 396, 397, 398, 399, 406, 425, 426, 427, 429, 430, 431, 432, 433, 434, 436, 437, 441 |
| `IMAGE_TEST_FIXTURE_CANDIDATE` | 0 | none added |
| `MANUAL_REVIEW_REQUIRED` remainder | 2 | 329, 330 |

The 35 quarantine recommendations are not immediate actions. Fourteen already have terminal rejected jobs and can enter a separately authorized archive review. The other 21 depend on first resolving an exact stale preview. Products 329 and 330 remain manual because they have price/variant intent but no original Media; this job/duplicate audit cannot resolve them.

## Five-product image test set

All five remain non-public, non-sellable drafts with original Media first, no screenshot/text source, no active/preview job, no pending publish, Shopier, dispatch, story, or advertising operation, no order/inquiry, no exact duplicate-reference group, and no Golden Product Set holdout conflict. Their generated-Media footprint is bounded and preserved.

| Product | Visual reference | Current image history | Readiness |
| --- | --- | --- | --- |
| 334 / SN0008 | Media 1315, 720x1280 JPEG; blue loafer clearly visible | one terminal approved job; gallery 3 | safe, but not history-clean |
| 337 / SN0011 | Media 1327, 960x1280 JPEG; tan loafer clearly visible | one terminal approved job; gallery 3 | safe, but not history-clean |
| 343 / SN0017 | Media 1348, 960x1280 JPEG; hand-held sneaker clearly visible | one terminal approved job; gallery 3 | adversarial scene, not history-clean |
| 349 / `BOS-MPVYVL8Q` | Media 1377, 1536x1024 PNG; isolated black suede loafer clearly visible; three originals | zero job history; gallery 0 | cleanest durable-slot smoke candidate |
| 366 / SN0037 | Media 1439, 960x1280 JPEG; sandal/open footwear clearly visible | one terminal rejected job; gallery 0 | safe negative-history fixture |

Exact recommended resumed-smoke product: **349 / `BOS-MPVYVL8Q`**. It is the only loafer candidate with zero job history and zero generated gallery. Protected-brand classification does not block image generation; claims, approval, activation, publishing, advertising, Shopier, and dispatch guards remain separate.

Under a separate live-smoke authorization, the operator must send only this command in the private Uygunops DM:

```text
#gorsel 349
```

Do not use the shared group path and do not send the command as part of this checkpoint.

## Future action packages

### Package A — Safe reversible job reconciliation

No status-only repair is authorized now, and no category-C stuck product exists.

1. Terminal duplicate archive review, no job mutation required first: 365, 370, 377, 378, 379, 380, 381, 382, 384, 392, 395, 396, 397, 441. Evidence: zero-value, no-business duplicate drafts; active-like job count zero; job terminal/rejected. Future action: preserve Products, originals, jobs, generated Media, and relationships; set only the existing reversible archived/homepage-hidden draft state. Risk: incorrect canonical selection; mitigate by using the group anchors above and exact pre/post counts.
2. Post-decision archive review: 368, 373, 385, 387, 388, 393, 394, 398, 399, 406, 425, 426, 427, 429, 430, 431, 432, 433, 434, 436, 437. Dependency: Package B must first make the exact preview job terminal and synchronize visual status. Reversibility and preservation are the same as item 1.
3. Post-decision keep-draft reconciliation: the 23 stale-preview members of the 25-product `KEEP_DRAFT` recommendation. Future action: after the operator decision, keep the product draft and preserve all Media/job history; only the exact job decision and corresponding visual state should change. Products 374 and 383 already have terminal rejected jobs and require no job-state repair.

### Package B — Operator preview decisions

All 44 rows in the active-like table require an explicit exact-job operator decision because none has durable Telegram delivery proof. There is no safe blanket approval.

- Mandatory reject: product 406 / job 378. The reference is not a product and the outputs invent identity. Preserve as failure evidence.
- Review then approve or reject: the other 43 exact product/job pairs. If the original keyboard is visible, verify its job/product before using it. If it is absent, do not use free-text approval/rejection because that selects by chat recency; use a separately authorized exact-ID reconciliation procedure.
- After every future decision, verify job terminal status, product visual state, unchanged original relationship, expected gallery delta (zero on rejection), no new job/attempt/provider call, and retained Media count.

Risk: callback authorization is not yet fail-closed and old keyboard delivery state is not durable. This package should not begin until the operator owns the exact callback context or an exact-ID maintenance procedure is reviewed.

### Package C — Duplicate/reference remediation

1. Preserve/operator review only: G1 and G4. Their multiple published/confirmed records make canonical selection ambiguous.
2. Preserve commercial anchors and archive-review conclusive repeated intake: G2 (365), G3 (review 332 versus anchor 335), G5 (377/436/437), G11 (425/426/427), and G13 (441).
3. Preserve one evidence anchor and archive-review the zero-value repeated-intake copies: G6-G10 and G12, using anchors 383, 371, 374, 375, 386, and 428 respectively.
4. Media consolidation is a later storage task only after Product decisions. All 54 original Media records are currently provenance; no relationship should be detached and no binary should be deleted in the same operation as product review.
5. Product 406 reference correction is separate: first preserve provenance and reject/reconcile job 378, then archive it. Do not replace Media 1657 in place.

## Unresolved risks

- Telegram preview sends and keyboard message IDs are not durably recorded; `preview` is not proof of delivery.
- Existing callbacks do not yet share the message-path fail-closed authorization boundary.
- Legacy jobs lack attempt and semantic slot lineage; historical partial sets must remain slot-unknown.
- The 23 non-processing Payload execution rows without `completedAt` need a separate queue-record audit, but they do not represent live work and are not linked to these previews.
- No generated-Media retention duration or recoverability window has been approved.
- G1 and G4 need operator inventory/provenance review; product equivalence cannot be inferred from the bytes.
- Products 329 and 330 still lack originals and remain legitimate manual review.

## Exact next task

After the operator separately authorizes live work, resume **CONTROLLED PRODUCTION DURABLE SLOT IDENTITY SMOKE V1** with product **349 / `BOS-MPVYVL8Q`** by manually sending `#gorsel 349` only in the private Uygunops DM. Observe exactly one attempt and stop at the existing human checkpoint. Do not reconcile the 44 stale previews in the same task.
