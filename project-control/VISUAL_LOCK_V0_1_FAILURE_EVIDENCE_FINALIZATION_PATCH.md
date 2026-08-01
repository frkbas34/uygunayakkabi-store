# Visual Lock V0.1 — Failure Evidence Finalization Patch

Date: 2026-08-01

Status: local implementation; not committed, pushed, deployed, or run against production

## Reproduced failure

Production Job 433 proved that evaluator `unknown/provider_response_incomplete` was blocked before Media and preview, but its attempt lacked deterministic geometry and `qualityGateSummary`, and Product 349 remained at `workflow.visualStatus=generating`.

## Actual root cause

Both active provider functions treated V0.1 quality authorization as provider-generation success. They assigned the generated JPEG to `finalBuf` only when the evaluator returned `pass`. A `fail` or `unknown` evaluator result therefore discarded the only transient buffer inside the provider layer. The compatibility adapter received zero successful buffers, and `imageGenTask` entered its generic zero-output failure branch before deterministic normalization, geometry measurement, pack-summary construction, or V0.1 product-state finalization.

The generic failure branch persisted terminal job/attempt status and shallow evaluator slot metadata, but it had no V0.1-specific product workflow cleanup. That left the product-level `generating` marker stale.

## Narrow correction

- Provider generation and quality authorization are now separate facts for V0.1 only. Successfully generated JPEGs remain transient task inputs even when evaluator state is `fail` or `unknown`.
- Existing evaluator prompts, schemas, provider calls, models, retries, prompt digests, slot IDs, and thresholds are unchanged.
- Deterministic normalization and geometry now run for every available transient slot buffer. Geometry records occupancy, horizontal/vertical/maximum center offset, clipping, slot gate state, and reason codes.
- A complete V0.1 summary records ordered slot evidence plus pack occupancy minimum, maximum, spread, evaluator completeness, orientation, topology, geometry, combined quality state, and deduplicated reasons.
- A non-pass summary converts only generated envelopes to terminal quality-gate failures and erases every transient output before the Media persistence function can run.
- The controlled non-pass path persists terminal job and attempt evidence, re-reads the product to avoid clobbering a concurrent terminal transition, and changes only active `pending/generating` visual state to `rejected` while preserving sibling workflow fields.
- The product write uses an explicit internal scoped-update context so the general Product channel-normalization hook does not add unrelated channel fields during this workflow-only mutation; normal Product saves retain their existing normalization behavior.
- Non-pass returns a handled task result with zero Media IDs. It creates no Blob, preview, approval control, gallery attachment, retry, or regeneration.

## Scope

No Payload collection field, migration, provider/model change, prompt/evaluator change, threshold change, default-profile change, Visual Lock V0 change, production mutation, provider call, Telegram action, push, or deployment is included.

## Validation

- Visual Lock V0.1: 19/19 checks passed.
- Visual Lock V0: 24/24 checks passed; default and V0 prompt digests remain unchanged.
- Image-generation contracts: 10/10 checks passed.
- Product activation/scoped-update guard: 20/20 checks passed.
- Typecheck, lint, `test:safe`, and `validate`: passed.
- Next production build: compiled and completed successfully. Static-data reads reported the pre-existing unavailable local PostgreSQL credential shape and degraded to repository fallbacks; no database write or connection to production occurred.

No production reproduction, provider call, Telegram message, Media/Blob creation, schema action, push, or deployment was performed.
