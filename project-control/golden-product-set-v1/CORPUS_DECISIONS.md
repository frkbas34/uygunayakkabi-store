# Corpus decisions

## Authority and scope

This corpus operationalizes the Golden Product Set proposed by `VISUAL_CONSISTENCY_ENGINE_V1.md`, the evidence model in `PRODUCT_UNDERSTANDING_LAYER_V1.md`, and the lineage/migration invariants in `IMAGE_GENERATION_BLUEPRINT_V1.md`. It is a documentation/test corpus, not a production catalog mirror and not runtime learning state.

## Decision record

### D1 — Preserve the canonical 36/12 distribution

The target remains 36 products: 12 loafers; 4 lifestyle sneakers; 3 sports shoes; 3 formal lace-ups; 3 boots; 3 open-footwear cases; 2 heels/flats; 2 casual closed shoes; 2 children's shoes; and 2 unknown/adversarial references. This exactly follows the VCE proposal. The current subset does not rebalance or invent replacements.

### D2 — Materialize only defensible local evidence

The repository scan found one tracked product-path asset with product-image integration history. It is materialized as a provisional Layer A reference and a `needs_review` annotation. Seven hero assets are not selected because their only current linkage is storefront decoration and their rights/product provenance is undocumented. A screenshot, temporary frames, and build artifacts are categorically excluded.

The provisional source is not operator-approved. `sourceOriginality=original_reference` describes its evidence class; `originalityReviewStatus=needs_operator_confirmation` and unknown rights prevent approval and implementation readiness.

### D3 — Reference existing bytes instead of copying them

The selected file remains at its existing tracked repository path. The manifest pins SHA-256, byte length, detected media type, and extension mismatch. Copying the same binary into `fixtures/` would create redundant storage and two mutable locations. A sanitized derived copy is allowed later only when the manifest retains source and derived lineage.

### D4 — Layer A and Layer B never share truth authority

Layer A contains originals, reviewed annotations, explicit unknowns, Reference Sufficiency Maps, Product Identity Fingerprints, and Locked Fact Sets. Layer B may later retain generated outcomes, attempts, providers, versions, slots, evaluations, decisions, drift, cost, and latency. Layer B has `identityTruthAuthority=never`; generated outcomes cannot backfill, overwrite, or approve Layer A.

### D5 — Unknown is a first-class result

Not visible is not absent. Unauthenticated visual texture is not a material claim. Unseen medial, outsole, rear-center, pair, or handedness facts remain unknown. Profile defaults may constrain handling but cannot become observations. The first annotation deliberately contains no locked facts.

### D6 — Human review is authoritative and append-only

States are `draft`, `needs_review`, `reviewed`, `disputed`, `approved`, and `superseded`. Reviewed and approved states require a human operator identifier and timestamp. Approval also requires human authority and reason. Every update increments the annotation version and appends a reversible history event; approved files are never silently overwritten.

### D7 — Adopt calibration/holdout only at viable corpus size

The target split is 24 calibration and 12 holdout, with 8 and 4 loafers respectively. It is adopted as the future assignment policy because a one-third holdout protects against prompt/profile/provider/evaluator overfitting while preserving enough development examples. The current single candidate is calibration; no holdout is falsely materialized.

When populated, developers may see holdout stable IDs, family counts, and evaluation summaries, but not detailed holdout annotations or per-dimension expected answers during tuning. The operator or designated independent reviewer controls detailed holdout annotations. Holdout evaluation occurs at release-candidate boundaries and after material prompt/profile/provider/evaluator changes, not during every tuning loop. Reports disclose aggregate family and failure-code results plus regressions without exposing answer keys.

### D8 — Blind comparison separates identity from aesthetics

Future A/B review uses stable product and semantic slot IDs, shuffled result order, and hidden provider/prompt/profile identity. Reviewers score individual slots before pack consistency, and identity fidelity before aesthetics. Each decision records explicit failure codes, confidence, and tie/abstain. Provider identity is unblinded only after decisions are sealed. Cost and latency are compared separately and never redefine identity truth.

### D9 — Semantic versioning preserves benchmark meaning

- Corpus version changes when membership or benchmark interpretation changes.
- Selection version changes when products move, retire, enter, or switch calibration/holdout.
- Schema major/minor/patch follows incompatible/additive/clarifying semantics.
- Each annotation has its own version and append-only history.
- Source replacement creates a new reference ID and hash; the old reference is retained as superseded.
- Family corrections and Locked Fact Set changes create a new annotation version and invalidate prior digests without rewriting historical results.
- Holdout changes require a selection-version change and leakage review.

### D10 — No runtime gate is authorized here

Failure codes are advisory annotations with guidance about what could later block. V1 does not implement a preview, generation, publishing, or dispatch blocking policy. Protected-brand classification never affects image-generation eligibility.

## Implementation acceptance gate

Visual-quality calibration requires valid schemas, original and sanitized selected references, sufficient loafer representation, complete provenance and explicit unknowns, clean duplicate/leakage checks, an operator-reviewed initial calibration subset, and deterministic fixture usability. Regression enforcement additionally requires the complete reviewed distribution, sealed holdout, stable evaluator definitions, baseline results, and an approved change/reporting process. Pure metadata contracts and durable slot identity are structural work and may proceed under separate authorization without satisfying the visual-quality corpus gate.

Current classification: **blocked by missing source references**. It is neither suitable for visual-quality calibration nor regression enforcement; this does not block separately authorized pure metadata and durable-slot work.
