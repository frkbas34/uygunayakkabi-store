# Golden Product Set V1

Golden Product Set V1 (GPS V1) is the local, versioned evidence baseline for footwear Product Understanding, Digital Product Identity, locked facts, slot consistency, loafer stability, and future image-generation comparisons. Layer A original references define product truth. Layer B generated outcomes are a future, separate archive and can never rewrite Layer A.

## Current state

- Intended corpus: 36 unique products, including 12 loafers.
- Materialized draft records: 1 lifestyle sneaker.
- Operator-approved records: 0.
- Materialized loafers: 0.
- Readiness: `blocked_missing_source_references`.
- Runtime authority: none. These fixtures do not affect `src`, generation, publishing, or production data.

The single record is deliberately `needs_review`. Git evidence supports treating its file as a product-reference candidate, but the operator must still confirm originality, owned-product linkage, usage rights, and the proposed family. No machine-created annotation is approved or locked.

## Operational map

| Artifact | Purpose |
|---|---|
| `manifest.json` | Canonical corpus membership, distribution, versions, references, hashes, and readiness |
| `manifest.schema.json` | Machine contract for the manifest; generated identity sources are impossible by schema |
| `annotations.schema.json` | Machine contract for facts, provenance, unknowns, review history, sufficiency, risks, and loafer fields |
| `annotations/` | One annotation per materialized product |
| `inventories/` | Discovered candidates, exact exclusions, and operator source gap |
| `fixtures/README.md` | Reference-by-path and binary-copy policy |
| `FAILURE_TAXONOMY.md` | Stable evaluation and operator rejection vocabulary |
| `OPERATOR_REVIEW_GUIDE.md` | Human review, approval, loafer, replacement, and blind-comparison protocol |
| `validation/` | Current deterministic validation evidence |

## Validate

From the repository root:

```powershell
node scripts/validate-golden-product-set-v1.mjs
npm run typecheck
npm run lint
git diff --check
```

The corpus validator treats the missing 35 products and 12 loafers as declared readiness blockers, not as fabricated schema failures. Broken references, changed hashes, duplicate selected hashes, generated Layer A sources, silent approval, positional slot authority, secrets, or production URLs are hard failures.

## Intake boundary

New sources must be sanitized, repository-safe originals for the operator's own products. Do not import from production systems in this task. Place or reference a file only after rights and product linkage can be recorded. Never use generated media, screenshots, temporary artifacts, customer media, signed URLs, or undocumented hero decoration as canonical truth.

The exact next runtime task, under separate authorization and independently of the still-blocked visual-quality corpus gate, is **Pure Metadata Contracts and Durable Slot Identity Foundation**. It must add canonical slot IDs, non-positional failure-preserving slot records, immutable attempt IDs, versioned contracts, and legacy compatibility under tests without prompt, camera, slot-purpose, provider, or generation-quality changes.
