# Visual Lock V0.1 — Controlled Production Pilot

Status: `VISUAL_LOCK_V0_1_PILOT_FAIL_EVIDENCE_PERSISTENCE`

Evidence date: 2026-08-01

Runtime commit: `3982aa380058ef712a1ebe4070387a37f110907f`

## Decision

The Product 349 V0.1 attempt failed closed before Media or Telegram preview persistence, but the blocked pack did not retain the complete structured evidence required by the pilot. All five slot evaluators persisted `unknown` with `provider_response_incomplete`, while the attempt-level `qualityGateSummary` and every geometry-gate result remained absent. Product 349 also remained at stale `workflow.visualStatus=generating` after the exact image job became terminal `failed`.

The primary result is therefore `VISUAL_LOCK_V0_1_PILOT_FAIL_EVIDENCE_PERSISTENCE`, not a quality-gate pass or partial visual result. Product 343 was not authorized and was not run. No code fix is included in this goal.

## Push, deployment, and health

- Reviewed commits `3dc95a3` and `3982aa3` were pushed normally from `main` to `origin/main`; no force option was used.
- Automatic Vercel remote-Git deployment `dpl_8rDWHLFHTofGMd3t7Pwh5CBBMYKS` reached `READY` at exact commit `3982aa380058ef712a1ebe4070387a37f110907f`.
- Production aliases resolved to that deployment and exact commit.
- Targeted control-plane evidence confirmed exact `PAYLOAD_DB_PUSH=false`; no schema push or DDL occurred.
- `/`, `/yardim`, and `/admin` returned HTTP 200. The deployment/pilot log windows contained no critical or HTTP 5xx event.
- Default and V0 prompt digests remained unchanged; V0.1 remained an authorized-private-DM-only opt-in profile.

## Human checkpoint and exact binding

The operator manually sent the following command in the real private chat with `@Uygunops_bot` at approximately 04:50 Türkiye time:

```text
#gorsel 349 --profile=visual-lock-v0.1 --family=loafer
```

The exact database timestamp was `2026-08-01T01:50:40.996Z` (`04:50:40.996+03:00`). Exactly one new image job matched the product, command window, profile, and family:

| Product | Job | Attempt | Profile | Family | Terminal state |
|---|---:|---|---|---|---|
| 349 / SN0117 | 433 | `iga_98993577-7914-422f-a446-0491da984e34` | `visual-lock/v0.1` | `loafer` | `failed` |

Payload execution 530 ran once, recorded one failed execution log, and ended with `processing=false`, `hasError=true`, and `totalTried=1`. Payload documents `hasError=true` as non-retryable. No active worker or active/preview image job remained.

## Contract and slot evidence

The job recorded:

- `image-slot-contract/v1`;
- `product-identity-anchor/v0` and a non-empty shared anchor hash;
- `visual-framing-lock/v0`;
- `loafer-identity-lock/v0`;
- `component-topology-lock/v0.1` and a non-empty topology hash;
- `visual-quality-evaluator/v0.1`;
- `visual-geometry-gate/v0.1`;
- the exact five semantic slots `side`, `hero_3q`, `top`, `back`, `detail`.

Every slot executed exactly once. Each persisted `provider_failed`, evaluator state `unknown`, color/topology/orientation state `unknown`, detected shot `unknown`, and reason code `provider_response_incomplete`. There was no retry or second attempt.

The fail-closed boundary worked: unknown never became pass. However, generation rejected each transient output inside the provider adapter before the task reached the pack geometry block. The attempt therefore has no `qualityGateSummary`, no occupancy measurement, no center-offset measurement, no occupancy-spread result, and no per-slot geometry state/reason code. This is insufficient structured gate evidence under the pilot contract.

## Provider-call breakdown

The exact executed call graph was:

| Call type | Model | Count |
|---|---|---:|
| Reference validation | `gemini-2.5-flash` | 1 |
| Identity extraction | `gemini-2.5-flash` | 1 |
| Slot image generation | `gemini-2.5-flash-image` | 5 |
| V0.1 slot evaluator | `gemini-2.5-flash` | 5 |
| **Total** |  | **12** |

The reference validation returned valid with low confidence. Identity extraction completed and produced the shared anchor. Each image generation returned a transient image and invoked one strict evaluator. Each evaluator ended with a non-`STOP` provider response, mapped to `unknown/provider_response_incomplete`. Generation retries: zero. Regeneration attempts: zero.

## Persistence, preview, and orphan checks

- Media rows for Job 433 / its attempt: 0.
- Job `generatedImages`: 0; `imageCount`: 0.
- Attempt slot `mediaId` values: all null.
- Vercel Blob objects containing the exact attempt ID: 0, verified by read-only list under the `ai-349-` product prefix.
- Telegram preview albums: 0.
- Approval keyboards: 0.
- Job preview/review transition: 0.
- Product 349 generated gallery: 0, unchanged.
- No approval, rejection control, regeneration, second command, publishing, Shopier, advertising, activation, or dispatch occurred.

The runtime may send its ordinary failure notification, but it sent no image preview and no approval/regeneration controls. Codex sent no Telegram message.

## Product-state comparison

The preflight state was draft, non-public, non-sellable, confirmation pending, publish not requested, generated gallery empty, and visual status rejected. After the terminal failure, all listed business/publication fields and the gallery remained unchanged, but `workflow.visualStatus` remained `generating` rather than returning to a terminal/non-active visual state. This is an operational state-finalization defect and blocks treating the baseline as clean for another attempt.

## Baseline comparison

Product 349 baseline Job 428 scored 3.4. Visual Lock V0 Job 431 scored 3.8 and was rejected with five retained Media. V0.1 Job 433 produced no persisted preview, so no visual score or baseline/V0/V0.1 quality comparison is valid. The only valid V0.1 comparison is operational: fail-closed evaluator handling prevented unverified output from reaching Media or preview, while complete pack evidence and product-state finalization failed.

Product 343 was intentionally skipped. Its baseline Job 430 and V0 Job 432 were not mutated or rerun.

## One next hypothesis

V0.1 converts evaluator-unknown slot buffers to null inside the provider adapter, so the task takes the generic zero-output exit before pack geometry, `qualityGateSummary`, and failure-state finalization. Preserve transient buffers only through the non-persisting pack-evaluation phase, then discard them before Media whenever the combined gate is not pass; this should retain complete geometry/evaluator evidence without weakening fail-closed persistence.

Exact next task: **VISUAL LOCK V0.1 — FAILURE EVIDENCE FINALIZATION PATCH**.

Structured evidence is in `project-control/visual-quality-fast-track-v1/visual-lock-v0-1-pilot-results.json`. No image binary is committed.
