# Visual Quality Fast Track Baseline V1

Date: 2026-08-01

Scope: Mini Golden Set V0, three current-profile five-slot packs, two new operator-triggered attempts

Runtime changes: none

## Result

Three complete production packs were visually measured against five reviewed fixture sources. The current system reliably isolates the target, preserves broad category and color, produces clean studio backgrounds, and persists exact semantic-slot lineage. It does not yet preserve countable component topology or geometry across independent slots. The recurring failures are toe/vamp/opening drift, seam redrawing, changing ornament or eyelet topology, unsupported rear construction, loose full-product scale, and rear-three-quarter outputs where a controlled back view is expected.

This evidence supports one narrow next step: **Visual Lock V0**. It does not support a provider replacement, slot redesign, prompt rewrite, or camera redesign in this task.

## Git and safety boundary

Preflight was performed on canonical `main` at `678e6ee7c0e73745a319a6949c287da6632f10ee`, equal to `origin/main`, with a clean working tree and no active Git operation. The parking branch remained at `9f4336f0490cc1190c2fe36f9a87bffb003f818e`; the existing backup branch and both stashes were not modified.

Production discovery and verification used bounded `READ ONLY` PostgreSQL transactions that were rolled back. Reference and generated image retrieval used read-only HTTP GETs. No command was sent by Codex, and no provider, Product, Media, gallery, publishing, Shopier, schema, Blob, or Telegram mutation was performed by Codex.

## Mini Golden Set V0

| Product | Role | Reviewed source truth | Baseline use |
| --- | --- | --- | --- |
| 349 / SN0117 | Primary black suede loafer | Three clean views establish long raised vamp, soft-square toe, closed back, low white sole, apron seam, and BOSS/twin-motif ornament. | Baseline A, existing Job 428 |
| 334 / SN0008 | Navy category-confusion control | Source is visibly a lace-up moc-toe casual shoe, not a literal loafer; single side view leaves top/back unknown. | Baseline B, new Job 429 |
| 337 / SN0011 | Tan moccasin/loafer control | Tan suede-like moccasin/boat-shoe hybrid with rope trim and thick wrapped sole; single side view. | Source truth only; not generated |
| 343 / SN0017 | Adversarial retail-scene sneaker | Light-grey mesh slip-on with curved side overlay, toe cap, heel pull tab, and cavity sole; unrelated shoes and retail scene surround target. | Baseline C, new Job 430 |
| 366 / SN0037 | Open-footwear control | White two-buckle open sandal with cork-like footbed; pair overlap, tag, hand, and box increase contamination risk. | Source truth only; not generated |

The complete visible-fact annotations, unknown regions, reference sufficiency, and category-confusion risks are in [`mini-golden-set-v0.json`](visual-quality-fast-track-v1/mini-golden-set-v0.json).

## Baseline discovery and attempts

Product 334 had only approved legacy Job 309 with three positional Media and no attempt or semantic lineage. Product 343 had only approved legacy Job 318 with the same legacy limitation. Neither was reusable. Exactly two new attempts were operator-triggered; Product 337 and Product 366 were not generated.

| Baseline | Job / attempt | Provider | Attempt duration | Media and slots | Terminal evidence |
| --- | --- | --- | ---: | --- | --- |
| A — Product 349 | Job 428 / `iga_dea1a935-683e-45b9-b876-8c8e3b74162a` | Gemini 2.5 Flash Image | 112.332 s | 1951 side, 1952 hero_3q, 1953 top, 1954 back, 1955 detail | Rejected; zero gallery attachment |
| B — Product 334 | Job 429 / `iga_b5de1c30-9815-436b-b0cb-61eb5d252714` | Gemini 2.5 Flash Image | 84.130 s | 1956 side, 1957 hero_3q, 1958 top, 1959 back, 1960 detail | Rejected; zero new gallery attachment |
| C — Product 343 | Job 430 / `iga_b1a52f31-60d5-4362-ab81-493aa10c5519` | Gemini 2.5 Flash Image | 80.891 s | 1961 side, 1962 hero_3q, 1963 top, 1964 back, 1965 detail | Rejected; zero new gallery attachment |

Job 429 was triggered from the shared group using a Uygunops mention. Uygunops created exactly one job while GeoBot emitted a parallel active-job deduplication message; no second attempt was created. This is command-ownership/routing evidence to retain, not authorization for a Telegram refactor here. Job 430 was triggered correctly in the private Uygunops DM. The operator rejected both new previews without approval or regeneration.

## Human visual baseline

The machine-structured per-dimension, per-slot scores and every low-score failure reason are in [`baseline-scorecard-v1.json`](visual-quality-fast-track-v1/baseline-scorecard-v1.json). The review method and scale are fixed in [`review-guide.md`](visual-quality-fast-track-v1/review-guide.md).

### Pack summary

| Pack | Pack mean / 5 | Strongest | Weakest | Same shoe across all five? | Professional set? |
| --- | ---: | --- | --- | --- | --- |
| Product 349 | 3.4 | side | back | Mostly, but loafer geometry is not locked | No |
| Product 334 | 3.4 | side | back | Broadly, but eyelet/lace/heel topology changes | No |
| Product 343 | 3.8 | side | top | Yes at category level, not component-geometry level | Yes, with identity caveats |

### Slot means

These means summarize the 18 required slot dimensions; the JSON retains every individual score and failure reason.

| Product | side | hero_3q | top | back | detail |
| --- | ---: | ---: | ---: | ---: | ---: |
| 349 | 4.278 | 3.611 | 3.611 | 2.944 | 4.222 |
| 334 | 4.167 | 3.444 | 3.556 | 3.000 | 3.722 |
| 343 | 4.056 | 3.778 | 3.611 | 3.389 | 3.944 |

### Product 349 — dedicated loafer diagnosis

Direct observations:

- Side is the strongest identity match and retains the closed heel, long vamp, low white sole, material, color, apron, and ornament.
- Hero and top retain a loafer but change toe width, vamp length, apron path, wordmark/motif placement, and full-product scale.
- Back is not a controlled back view. It introduces a broader heel, exaggerated opening/vamp, newly synthesized seam structure, and a thicker sculpted heel/sole.
- Detail is useful and materially faithful, but it cannot verify the opening or heel.
- No Oxford/lace conversion occurred. Mule conversion did not occur. The main category pressure is toward a broader generic moccasin/slipper form in hero, top, and especially back.

Top identity failures: `VAMP_LENGTH_DRIFT`, `SEAM_PATH_DRIFT`, inconsistent ornament topology.

Top geometry/framing failures: `HEEL_BACK_DRIFT`, `TOE_GEOMETRY_DRIFT`, `SCALE_INCONSISTENT`/`ORIENTATION_INCONSISTENT`.

### Product 334

Direct observations:

- All slots remain a navy lace-up moc-toe casual shoe with a thick dark sole; there is no true loafer-to-boat-shoe conversion because the source itself has laces and a moc toe.
- Eyelet count changes between two and three, lace topology changes, apron/facing seams move, and toe/vamp proportions vary.
- Back invents an unsupported lace or loop across the heel and does not provide a direct rear view.
- Side is the strongest source match; back is the weakest and contains the severe artifact.

Top identity failures: `HARDWARE_INVENTED`, `SEAM_PATH_DRIFT`, `IDENTITY_DRIFT`.

Top geometry/framing failures: `HEEL_BACK_DRIFT`, `TOE_GEOMETRY_DRIFT`, `SCALE_INCONSISTENT`.

### Product 343

Direct observations:

- The adversarial retail scene was removed cleanly; unrelated formal shoes, hand, boxes, and furniture did not leak into the outputs.
- Broad category, light-grey color, mesh appearance, toe cap, curved side overlay, pull tab, and sculpted white sole remain recognizable.
- The instep patch changes shape and size; openings, heel pull tab, side overlay, toe cap, and sole-cavity count/layout change across slots.
- Back is rear three-quarter rather than direct rear. Top invents the strongest unsupported shield-shaped vamp patch and is the weakest slot.
- Pack is visually polished, but component geometry does not prove one immutable shoe.

Top identity failures: `IDENTITY_DRIFT`, `SEAM_PATH_DRIFT`, `VAMP_LENGTH_DRIFT`.

Top geometry/framing failures: `OPENING_SHAPE_DRIFT`, `HEEL_BACK_DRIFT`, `SCALE_INCONSISTENT`.

## Recurring failure map

The following separates direct observation from likely cause. Likely causes remain hypotheses until the next controlled implementation comparison.

| Recurring observation | Likely architectural layer | Evidence and boundary |
| --- | --- | --- |
| Eyelet, ornament, vamp-patch, pull-tab, and seam topology changes | Product understanding + identity lock | Current outputs preserve broad labels/color but not countable component facts. Textual identity extraction exists, but persisted results demonstrate missing or ineffective topology invariants. |
| Toe, vamp, opening, heel, and sole ratios change | Identity lock + prompt assembly | Three-view Product 349 still drifts, so source insufficiency alone cannot explain the pattern. Independent slot execution likely amplifies it. |
| Product 334/343 top and rear facts are invented | Source-reference sufficiency | Each has only one side-oriented original. Unseen regions must remain explicit unknowns rather than silently becoming fixed truth. |
| Back slots are oblique rear views | Camera/orientation instruction + slot compliance | Both new packs and Product 349 fail to produce a controlled direct-back view. This is an observed slot-purpose miss, not proof that camera redesign is required. |
| Full-product footprint varies | Scale/centering instruction | Centering is generally acceptable and backgrounds are stable, but occupancy is not locked. Deterministic centering alone does not equal scale consistency. |
| Color checks pass while visible topology drifts | Fidelity evaluator | Jobs 429/430 persisted color pass with no warning; human review still found eyelet, patch, seam, and heel contradictions. |
| Clean isolation/background across difficult sources | Provider execution + deterministic transforms | This is a current strength. Post-processing is not the primary identity bottleneck shown by this baseline. |

No evidence justifies blaming Gemini alone. The observed result is produced by the whole source-understanding, lock, prompt, slot, provider, evaluator, and transform chain.

## Visual Lock V0 hypothesis

The next controlled implementation should add one narrow pre-generation lock, without changing provider or slot purposes:

1. **Product identity anchor** — one structured anchor shared by all five calls, containing visible component counts/topology, seam graph, material/color, and explicit unknowns.
2. **Orientation-family lock** — each slot must remain in its named orientation family relative to the same canonical side; `back` must not degrade into arbitrary side/rear rotation.
3. **Scale/occupancy band** — the complete product or pair footprint should occupy 72–82% of the relevant canvas dimension for full-product slots; detail remains an intentional crop.
4. **Centering band** — full-product bounding-box center stays within 3% of canvas center with a stable footline band.
5. **Loafer geometry lock** — preserve toe width/roundness, vamp-to-length ratio, closed-back/opening topology, apron path, sole-to-upper ratio, and exact ornament topology; prohibit mule, slipper, moccasin, Oxford, tassel, strap, or metal conversion unless visible in the anchor.
6. **Cross-slot consistency instruction** — only slot camera/purpose may change; every anchored identity field is immutable across the five results.

This is a testable hypothesis, not an implemented design.

## Next-iteration success targets

- Mean `crossSlotCoherence`: improve from 3/5 to at least 4/5.
- Same-product-across-five score: improve by at least 1 point in each pack.
- Orientation-family compliance: 5/5 slots, including a controlled back view.
- Full-product occupancy spread: no more than 8 percentage points across comparable slots.
- Center offset: no more than 3% of canvas dimensions.
- Loafer category conversion: zero.
- Invented or changing hardware/ornament/component count: zero.
- Severe toe/vamp/sole drift: no more than one slot per pack.
- Pack professional-coherence rating: at least 4/5.
- Human score of 2 or lower on an identity/geometry dimension must produce a fidelity warning in the next evaluation loop.

These are pilot targets for the next controlled comparison, not permanent publish policy.

## Documentation and scope discipline

The Source Pack was not changed because no runtime capability, strategic decision, or roadmap truth changed. No prompt, camera, slot purpose/count, provider, transform, schema, Telegram route, publishing, Shopier, protected-brand eligibility, or runtime source file was modified. Generated image binaries remain outside Git.

Exact next task after this evidence checkpoint: **VISUAL LOCK V0 — FIRST CONTROLLED QUALITY IMPLEMENTATION**.
