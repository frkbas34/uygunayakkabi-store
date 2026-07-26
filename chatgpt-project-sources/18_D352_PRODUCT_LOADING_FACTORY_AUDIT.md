# Catalog Loading Factory Audit

Current as of 2026-07-26. The filename is retained for source-pack compatibility; this describes the current loading factory, not only milestone D-352.

## Current path

Telegram intake creates/updates Payload products, verifies images and product identity, confirms operator intent, generates content, runs audit/readiness checks, captures price/size/stock/channel targets, obtains explicit activation approval, and uses guarded channel/Shopier job paths.

`/loadplan` and `/loadingplan` combine Catalog QA and Category Fill into a read-only priority plan. Worklist rows hand off to `/productflow <ref>` and the exact read-only product-flow runtime smoke.

## Implemented strengths

- ProductFlow Snapshot exposes lifecycle, readiness, activation blockers, Image QC, Shopier gate, dispatch, coherence, links, and one primary next step.
- Dependency ordering prevents impossible content/audit suggestions.
- Shopier dashboard and previews reuse shared gate evaluation and product-flow handoffs.
- Protected-brand activation/public/claims/dispatch gates remain enforced.
- Structured Image QC is represented in schema and diagnostics.

## Blocking gaps

- Partial image generation or Media-save failure can misalign later buffers with positional slot metadata.
- Generated-media rejection/regeneration does not have automatic lifecycle cleanup.
- Telegram message and callback authorization are not one fail-closed boundary.
- Telegram command ownership, long-running tasks, and handlers are concentrated in one very large route.
- Live provider and database readiness is unproven by this local audit.

Protected-brand classification is deliberately not a loading or image-generation gate. It remains enforced at claims, approval, activation, public storefront, Shopier, advertising, and external dispatch boundaries.

## Safe scaling rule

Scale catalog loading after P0 security and image-correctness gaps are resolved or explicitly risk-accepted. Continue preview-first, read-only operator diagnostics before confirmed queue, publish, redispatch, provider, or ad actions.
