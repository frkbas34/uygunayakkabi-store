# Visual Lock V0 — Controlled Production A/B Pilot

Status: `VISUAL_LOCK_V0_AB_PILOT_PARTIAL`

Evidence date: 2026-08-01

Runtime commit: `f15b8eb166750e17f6113ef02e50ed95d5b7244b`

## Decision

Visual Lock V0 remains opt-in. The two-product pilot produced measurable improvements, but it did not satisfy the full-pass gates. Product 349 improved from 3.4 to 3.8 and removed the baseline back-slot severe geometry artifact, yet its back slot was rear three-quarter rather than true rear, complete-product occupancy spread increased to 21.7 percentage points, and hero centering missed by 10.5%. Product 343 improved from 3.8 to 4.0 and passed the framing targets, but its top view lost source-supported instep-patch and side-overlay construction.

The generic control did not materially regress, so evidence does not support a loafer-only profile. It supports a narrow V0.1 iteration while the ordinary `#gorsel <id>` path remains unchanged.

## Deployment and safety boundary

- The reviewed baseline and Visual Lock commits were pushed without force and deployed from remote Git.
- Vercel deployment `dpl_8RHb5Lwf18tXmrWjkABUxocmeGcZ` reached `READY` at exact commit `f15b8eb`.
- `PAYLOAD_DB_PUSH=false`; no schema push or DDL occurred.
- `/`, `/yardim`, and `/admin` returned HTTP 200 and passive verification found no critical or HTTP 5xx log.
- Default prompt digest remained `4050a83f01eae0c200b013ce9fc744b41890f49180cb1af0e2173e2a38adb810`.
- V0 fixture digest remained `f6d25f7e4980c731c9e191bd6bfd7f9ee3ae104ac927f67bdb64ac77ae00238d`.
- `visual-lock/v0` remained available only through an authorized private Uygunops DM with an explicit supported family.
- Providers, models, slot count/IDs, retry count, transforms, protected-brand eligibility, and default generation behavior were unchanged.

## Exact operational evidence

Exactly two Visual Lock V0 attempts occurred.

| Product | Family | Job | Attempt | Calls | Slot generations | Retries | Terminal state |
|---|---|---:|---|---:|---:|---:|---|
| 349 / SN0117 | loafer | 431 | `iga_6731aedf-83ce-4ac7-9652-a92babe3f2cd` | 18 | 5 | 0 | rejected |
| 343 / SN0017 | generic | 432 | `iga_b3e22d29-e68f-48c1-a6ad-e01182117242` | 13 | 5 | 0 | rejected |

Both attempts created one immutable attempt and exactly five durable semantic results in canonical `side`, `hero_3q`, `top`, `back`, `detail` order. All ten Media records carry exact job/attempt/slot lineage and were retained as rejected evaluation evidence. Both five-image private previews and keyboards were delivered. The operator rejected each exact preview; no approval, regeneration, second attempt, new gallery attachment, publishing, Shopier, advertising, activation, dispatch, or BotEvent action followed.

Product 349's generated gallery remained empty. Product 343's three-item legacy gallery baseline remained unchanged; the pilot created no new attachment. This corrects the goal's stale Stage A assumption that Product 343's gallery was empty without mutating it.

## Product 349 — loafer comparison

Pack score increased from 3.4 to 3.8 (`+0.4`). Cross-slot coherence, professional appearance, and severe-artifact score each improved by one point. The pack preserved loafer category, closed back, black suede appearance, white sole, and avoided mule, slipper, Oxford/lace, tassel, strap, and metal conversion.

The strongest slot was `side`. The baseline back-slot slipper-like geometry failure was removed, but the V0 `back` output remained rear three-quarter rather than true rear. Wordmark/twin-motif scale and placement, vamp length, opening, apron seam, and pair geometry still drifted across views. Hero occupancy was 62.2% and its horizontal center was 10.5% off canvas center. Complete-product occupancy spread worsened from 18.5 to 21.7 percentage points, failing the eight-point gate.

## Product 343 — generic control comparison

Pack score increased from 3.8 to 4.0 (`+0.2`). The `back` slot became a true heel-centered rear view and the adversarial retail-scene reference remained isolated. Complete-product occupancy spread improved from 3.4 to 1.3 percentage points and maximum center offset was 1.2%, passing both framing gates.

The `top` slot was the weakness: it removed the reference-visible instep patch and curved side overlay, creating a direct component-topology conflict with `side` and `hero_3q`. Pull-tab, opening, heel, toe-cap, and sole-cavity details also remain inferred from a single side reference. Attempt metadata records `familyLockVersion=null`, proving no loafer family lock entered the generic path.

## Runtime evaluator findings

Human-visible evidence is authoritative. During both attempts, multiple structured color or visible-identity evaluator responses were malformed JSON, while persisted slot metadata still reported pass. The side-orientation evaluator returned HTTP 404 and runtime handling treated the resulting unknown state as acceptable. These are evidence-truth defects: evaluator parse/unavailability must not become a synthetic pass.

## Exact V0.1 recommendation

1. Keep Visual Lock opt-in; do not change the default `#gorsel` path.
2. Fail evaluator parsing closed or persist `unknown`; never synthesize PASS from malformed/unavailable output.
3. Repair the side-orientation evaluator endpoint/model contract and distinguish unknown from compliant.
4. Add measured post-generation gates: 72–82% full-product occupancy, no more than eight percentage points pack spread, and at most 3% center offset.
5. Require a true heel-centered rear view for `back` before preview.
6. Carry source-supported component topology explicitly: loafer wordmark/motif/apron/vamp and generic instep patch/side overlay/pull tab/sole-cavity rhythm.
7. Re-run these same two products only after a separately reviewed V0.1 implementation and explicit production authorization.

Structured per-slot scores, failure codes, metrics, job/attempt/Media lineage, and the decision record are in `project-control/visual-quality-fast-track-v1/visual-lock-v0-ab-results.json`. Image binaries remain outside Git.
