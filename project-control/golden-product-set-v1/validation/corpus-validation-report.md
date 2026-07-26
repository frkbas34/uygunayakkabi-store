# Corpus validation report

Date: 2026-07-26

Corpus: `gps-v1.0.0-draft.1`

Validator: `node scripts/validate-golden-product-set-v1.mjs`

## Result

**PASS WITH DECLARED READINESS WARNINGS**

The deterministic corpus validator completed with 47 passes, 4 warnings, and 0 failures.

Passed controls include:

- manifest and annotation JSON Schemas compile with the repository-installed Ajv;
- manifest and the selected annotation validate;
- stable product/reference IDs and one-annotation-per-product integrity;
- target distribution totals 36 and preserves 12 loafers;
- current distribution matches actual membership;
- selected reference exists and its SHA-256, byte length, magic-byte media type, and extension mismatch match the manifest;
- Layer A accepts only original-reference classification and excludes generated/screenshot/temporary classes;
- all 15 Reference Sufficiency regions are present exactly once;
- explicit unknowns, provenance, reversible history, and human-authority boundaries are present;
- no positional slot-authority fields;
- candidate, exclusion, and missing-source inventories are internally consistent;
- annotation failure codes exist in the canonical taxonomy;
- portable corpus data contains no web URL, absolute Windows path, secret-like assignment, or Telegram identifier field;
- Layer B remains future-only with no identity-truth authority;
- no corpus implementation exists under runtime `src`.

Declared warnings:

1. 35 products are missing against the canonical 36-product target.
2. 12 loafers are missing against the canonical loafer target.
3. The selected source's originality, rights, and owned-product linkage need operator confirmation.
4. No operator-approved initial review subset exists.

These are readiness blockers encoded in the manifest, not suppressed validation failures. Any undeclared count gap, missing reference, changed hash, generated Layer A source, silent approval, duplicate selected hash, leakage, or version mismatch fails validation.

## Specification consistency audit

| Specification | Result | Evidence |
|---|---|---|
| Image Generation Blueprint V1 | PASS | Immutable/failure-preserving lineage is reserved for the exact next runtime task; corpus uses no array position as identity and changes no runtime behavior. |
| Product Understanding Layer V1 | PASS | Original-only evidence, provenance layers, fact states, explicit unknowns, Reference Sufficiency, fingerprint, and Locked Fact Set semantics are represented. |
| Visual Consistency Engine V1 | PASS | Exact 36/12 distribution retained; semantic slot risks, no compaction, loafer priority, and separate outcome archive are documented. |
| Protected-brand operator decision | PASS | No brand classification affects corpus inclusion as a generation gate; failure policy remains advisory. |

## Readiness result

- Complete corpus: **no**.
- Structurally complete awaiting operator review: **no**, because 35 source records are absent.
- Blocked by missing source references: **yes**.
- Suitable for visual-quality calibration: **no**.
- Suitable for regression enforcement: **no**.
- Suitable to unblock separately authorized pure metadata contracts and durable slot identity: **yes; that structural task does not require visual-quality calibration**.

The validator is intentionally outside `src` and required no package-file change, dependency install, provider, network, production, or runtime-model change.

## Repository validation matrix

| Check | Result |
|---|---|
| Corpus/schema/integrity validator | PASS — 47 pass, 4 declared readiness warnings, 0 fail |
| Source Pack governance | PASS — 20 current-truth documents, 48,615 bytes |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `git diff --check` plus new-file trailing-whitespace scan | PASS |
| Runtime `src` diff introduced by this task | PASS — none |
