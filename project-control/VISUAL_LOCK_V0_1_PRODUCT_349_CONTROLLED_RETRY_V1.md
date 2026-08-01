# Visual Lock V0.1 — Product 349 Controlled Retry

Status: `VISUAL_LOCK_V0_1_RETRY_PASS_COMPLETE_NONPASS_EVIDENCE`

Evidence date: 2026-08-01

Runtime commit: `02dd5424af365393ac5f1b6f8e63e0a4cea3ec24`

## Decision

The single authorized Product 349 retry completed as a quality-gate non-pass and verified the Visual Lock V0.1 failure-evidence finalization patch. Job 434 and its only attempt are terminal `failed`; all five transient slot outputs retain evaluator and deterministic geometry evidence; the pack-level quality summary is complete; and Product 349 returned to the existing safe `workflow.visualStatus=rejected` state.

No generated output crossed the persistence boundary. Job 434 created zero Media, zero durable Blob objects, zero Telegram image previews or approval keyboards, and zero gallery attachments. Product 343 was not run. The primary result is therefore `VISUAL_LOCK_V0_1_RETRY_PASS_COMPLETE_NONPASS_EVIDENCE`.

## Git, deployment, and health

- The reviewed commits `bd89c787` and `02dd5424` were pushed normally from `main` to `origin/main`; no force option was used.
- Automatic Vercel remote-Git deployment `dpl_DUPn2TvBRYdWKVMHnLcHLMZysRLz` reached `READY` at exact commit `02dd5424af365393ac5f1b6f8e63e0a4cea3ec24`.
- `PAYLOAD_DB_PUSH=false`; no schema push or DDL occurred.
- `/`, `/yardim`, and `/admin` returned HTTP 200. No critical or HTTP 5xx event was observed in the deployment or controlled-retry window.
- Product 349 passed the final pre-command readiness gate: `SN0117`, draft, non-public, non-sellable, three ordered original references, empty generated gallery, zero active/preview jobs, and an authorized private Uygunops DM route.

## Human checkpoint and exact binding

The operator manually sent the following command in the real private chat with `@Uygunops_bot` at approximately 07:16 Türkiye time:

```text
#gorsel 349 --profile=visual-lock-v0.1 --family=loafer
```

The exact Job timestamp was `2026-08-01T04:16:16.229Z` (`07:16:16.229+03:00`). Exactly one new Product 349 image job matched the post-Job-433 command window, profile, and family:

| Product | Job | Attempt | Profile | Family | Terminal state |
|---|---:|---|---|---|---|
| 349 / SN0117 | 434 | `iga_e305fc42-8f55-47c5-8c77-3cbcadb34035` | `visual-lock/v0.1` | `loafer` | `failed` |

Runtime logs recorded `Running 1 jobs`, `new: 1`, and `retrying: 0`. Job 434 contains exactly one immutable generation attempt; every semantic slot records provider attempts `1`; and no later Product 349 or Product 343 job was created. No active worker or active/preview image job remains.

## Contracts and provider calls

The attempt retained a non-empty identity-anchor hash and these exact contracts:

- `image-slot-contract/v1`;
- `visual-lock/v0.1`;
- `product-identity-anchor/v0`;
- `visual-framing-lock/v0`;
- `loafer-identity-lock/v0`;
- `component-topology-lock/v0.1`;
- `visual-quality-evaluator/v0.1`;
- `visual-geometry-gate/v0.1`.

The executed provider call graph was:

| Call type | Model | Count |
|---|---|---:|
| Reference validation | `gemini-2.5-flash` | 1 |
| Identity extraction | `gemini-2.5-flash` | 1 |
| Slot image generation | `gemini-2.5-flash-image` | 5 |
| V0.1 slot evaluator | `gemini-2.5-flash` | 5 |
| **Total** |  | **12** |

The reference-validation response was malformed JSON and followed the existing low-confidence valid fallback. Identity extraction completed. All five image-generation calls returned transient PNG buffers, and each slot invoked the strict V0.1 evaluator once. Each evaluator result remained fail-closed `unknown/provider_response_incomplete`. Generation retries and regenerations were both zero.

## Complete slot evidence

| Slot | Evaluator | Orientation | Topology | Occupancy | Center X | Center Y | Maximum | Clipping | Geometry | Geometry reasons |
|---|---|---|---|---:|---:|---:|---:|---|---|---|
| `side` | `unknown` / `provider_response_incomplete` | `unknown` / detected `unknown` | `unknown` | 83.854% | 0.260% | 16.667% | 16.667% | `fail` | `fail` | `occupancy_above_82`, `center_offset_above_3`, `clipping_detected` |
| `hero_3q` | `unknown` / `provider_response_incomplete` | `unknown` / detected `unknown` | `unknown` | 83.333% | 0.260% | 0.000% | 0.260% | `pass` | `fail` | `occupancy_above_82` |
| `top` | `unknown` / `provider_response_incomplete` | `unknown` / detected `unknown` | `unknown` | 82.552% | 0.000% | 0.391% | 0.391% | `pass` | `fail` | `occupancy_above_82` |
| `back` | `unknown` / `provider_response_incomplete` | `unknown` / detected `unknown` | `unknown` | 84.635% | 0.130% | 0.130% | 0.130% | `pass` | `fail` | `occupancy_above_82` |
| `detail` | `unknown` / `provider_response_incomplete` | `unknown` / detected `unknown` | `unknown` | 100.000% | 0.000% | 0.000% | 0.000% | `fail` | `pass` | `detail_slot_exempt` |

Every slot persisted `provider_failed`, a null Media ID/URL, one provider attempt, evaluator/orientation/topology state, occupancy, both center axes, maximum center offset, clipping, geometry status, and safe reason codes. `unknown` never became `pass`.

## Complete pack evidence

| Field | Persisted value |
|---|---|
| Required-slot occupancy minimum | 82.552% |
| Required-slot occupancy maximum | 84.635% |
| Occupancy spread | 2.083 points |
| Required evaluator completeness | `unknown` |
| Orientation gate | `unknown` |
| Topology gate | `unknown` |
| Geometry gate | `fail` |
| Combined quality gate | `fail` |

The complete pack reason set is:

```text
provider_response_incomplete
occupancy_above_82
center_offset_above_3
clipping_detected
detail_slot_exempt
required_evaluator_incomplete
orientation_gate_unknown
topology_gate_unknown
```

The pack summary is present in both the immutable attempt history and provider-results evidence. The non-pass is not softened: evaluator incompleteness, required-slot over-occupancy, and the side-slot centering/clipping failure independently prevent persistence.

## Terminalization and persistence boundary

- Attempt `iga_e305fc42-8f55-47c5-8c77-3cbcadb34035`: terminal `failed`, completed `2026-08-01T04:17:49.272Z`.
- Job 434: terminal `failed`, `imageCount=0`, `generatedImages=[]`, updated `2026-08-01T04:17:49.646Z`.
- Product 349: `workflow.visualStatus=rejected`, updated `2026-08-01T04:17:50.904Z`; no pending/generating residue.
- Active Product 349 image jobs: 0. Preview/review jobs: 0. Attempts on Job 434: 1.
- Product 349 Media count: 10 before and after; newest existing row predates the retry; Job 434 Media rows: 0.
- Product 349 Blob prefix: 40 objects before and after with identical canonical hash `8504ceaa6afce144c28938e2f98fc70bfb5a7758cbd790cea157498f0e05b213`; newest object predates the retry; Job 434 durable Blob objects: 0.
- Telegram image preview albums: 0. Approval keyboards: 0. The job never entered preview/review. An ordinary failure notification is not an image preview or approval control.
- Generated gallery attachments: 0. Original references remain `[1377, 1378, 1379]` in the same order.
- Product remains draft, non-public, non-sellable, confirmation pending, publish not requested, Shopier not synced, undispatched, and without advertising or activation activity.
- BotEvents for Product 349 remain 0. Product 343 has no post-command job and was not changed or run.

The five generated PNGs existed only as transient in-memory buffers for evaluation. Because the combined gate was non-pass, the task discarded them before Media/Blob persistence and before Telegram preview assembly.

## Quality comparison

No preview or generated Media exists for Job 434, so visual scoring against baseline Job 428 or Visual Lock V0 Job 431 would be fabricated. The valid comparison is operational: Job 433 omitted geometry/pack evidence and left stale product state; Job 434 persisted complete deterministic evidence, finalized the attempt/job/product safely, and preserved the zero-asset boundary.

## Exact next hypothesis

The remaining primary blocker is the evaluator response contract: all five strict evaluator calls returned incomplete/non-parseable evidence, preventing orientation and component-topology decisions. Separately, the new deterministic measurements show all four required non-detail slots above the 82% occupancy ceiling and the `side` slot vertically displaced and clipped. The next task should be **VISUAL LOCK V0.1 — EVALUATOR RESPONSE CONTRACT HARDENING V1**, preserving the current geometry evidence and persistence boundary before any prompt or camera change.

Structured evidence is in `project-control/visual-quality-fast-track-v1/visual-lock-v0-1-product-349-retry.json`. No image binary is committed, and the Source Pack is unchanged because this retry validates the already-deployed runtime rather than changing canonical runtime behavior.
