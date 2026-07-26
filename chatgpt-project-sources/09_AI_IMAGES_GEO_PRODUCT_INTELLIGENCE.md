# AI Images, GEO, and Product Intelligence

## Image generation

The active operator engine is Gemini image generation. `#gorsel`, `#geminipro`, and image buttons queue `imageGenTask` (`image-gen`) with `provider=gemini-pro`; `#chatgpt` is disabled. The job retains an OpenAI `gpt-image-1` path for legacy/explicit compatibility, but current regeneration redirects to Gemini.

The standard stage requests five slots: side, hero three-quarter pair, top pair, rear three-quarter, and detail. The premium compatibility stage requests slots four and five. A real reference photo is mandatory. Gemini Vision validates the input and extracts an identity lock; generation applies slot instructions, material and visual-fact locks, optional fidelity retries, deterministic centering/background normalization, stock-number overlay, and upscaling before Media persistence.

Generated Media is previewed in Telegram and remains separate from original media. Approval appends selected records to `generativeGallery`. Explicit Image QC PASS is required before generated media is publishable.

The local V1 correctness foundation uses `image-slot-contract/v1` and the unchanged semantic IDs `side`, `hero_3q`, `top`, `back`, and `detail`. Each execution creates a new immutable `iga_…` attempt ID and pre-creates one slot result per requested ID. The current provider functions remain unchanged; an orchestration adapter binds their semantic slot logs to compact success buffers, so a middle provider failure cannot relabel later outputs. Media persistence receives the envelope's job, attempt, contract, and slot identity. A Media-save failure marks that exact slot, remains in attempt metadata, and is excluded from Telegram preview/approval without compacting later slot identity.

Complete new runs retain the existing five-slot preview order. New approval buttons carry semantic slot IDs; numeric and historical positional actions use an explicit compatibility projection. Complete legacy records map only when unambiguous. Partial legacy records stay readable but use slot-unknown labels rather than invented lineage. Regeneration still reuses the current job record, but each execution appends a new attempt snapshot and preserves stored `visualFacts`; normalized attempt collections and targeted regeneration remain future work.

The committed runtime is not deployment-ready against the old schema. `project-control/IMAGE_SLOT_LINEAGE_SCHEMA_MIGRATION_PLAN_V1.md` defines the additive seven-column PostgreSQL expansion, corrected SQL hash `06191F19…961E2`, guarded helper, and expand-first rollout. The strictly isolated WSL schema-harness rehearsal passes, including rollback, apply, compatibility, five-slot round trips, idempotency, runtime-first rollback, and cleanup; `FULL_APPLICATION_COMPATIBILITY_NOT_PROVEN`. No application or production database was changed. Production pre-flight remains `PRODUCTION_PREFLIGHT_FAIL_SCHEMA_PUSH_UNSAFE`: local code is now fail closed, but Vercel preview/production omit `PAYLOAD_DB_PUSH` and the serving old runtime still treats absence as enabled.

Protected-brand classification must never block generation. The active task already bypasses the unused blocking helper. Brand safety still applies to claims, operator approval, activation, publishing, advertising, Shopier, and external dispatch. Visible-mark checks inside the provider path are reference-fidelity evaluators, not classification gates.

Known bottlenecks:

- A clean five-slot run uses roughly 13 serial provider calls and can rise toward 33 with visible-zone checks and one retry per slot; most calls lack explicit timeouts.
- Provider functions share a shape but there is no formal capability adapter, normalized error/usage model, or cost/latency budget.
- Prompt blocks overlap and are not independently versioned; camera authority and pair-shot comments disagree with runtime behavior.
- Comments and labels disagree about three-slot versus five-slot output and the default provider.
- Rejected/regenerated/partially approved previews can leave orphan Media.
- The additive attempt history is stored as structured job JSON rather than normalized attempt/slot collections; regeneration still reuses jobs, and complete targeted-regeneration/history UX is not implemented.
- `imagePromptBuilder.ts` is legacy and is not the active prompt path.
- Automatic fidelity checks and deterministic post-processing reduce defects but do not replace human QC.

The proposed evolution continues with normalized attempt/slot persistence, Media retention, provider adapters, versioned prompt modules, deterministic transform/evaluator lineage, and Telegram task presentation. Future style packs, profiles, quality scores, and evaluation loops build on that lineage. No prompt, camera, slot-purpose, slot-count, provider, or visual-quality redesign has been implemented.

`project-control/IMAGE_GENERATION_BLUEPRINT_V1.md` is the canonical target technical specification for future implementation. Current code and dated audits remain authoritative for current behavior.

`project-control/PRODUCT_UNDERSTANDING_LAYER_V1.md` is the canonical pre-prompt design beneath that blueprint. It defines a practical footwear taxonomy, evidence and uncertainty, original-reference sufficiency, versioned operator overrides, a locked Product Identity Fingerprint, Generation Profile resolution, and reviewed failure learning. It is architecture only: no classifier, profile, prompt, camera, slot, provider, or runtime behavior has been implemented.

`project-control/VISUAL_CONSISTENCY_ENGINE_V1.md` is the canonical layer after Product Understanding. It defines a provider-neutral Digital Product Identity and Identity Anchor, versioned product/pack/slot/regeneration contracts, geometry and bounding metadata without deterministic cropping, durable non-compacted slot results, asset Visual Fingerprints, advisory identity-drift vectors, and a loafer-heavy Golden Product Set proposal. No consistency engine, drift evaluator, prompt, camera, slot, provider, crop, or runtime behavior has been implemented.

`project-control/GOLDEN_PRODUCT_SET_V1.md` and `project-control/golden-product-set-v1/` now materialize the local corpus contracts, inventories, failure taxonomy, review protocol, schemas, validator, and one evidence-conservative draft lifestyle-sneaker annotation. Readiness is blocked: 1 draft candidate, 0 operator-approved products, and 0 loafers against the 36-product/12-loafer target. Generated outcomes remain a separate future archive and never define product identity.

## Product Intelligence and GEO

Product Intelligence can analyze product images/text, use Gemini, optionally perform reverse search through Google Vision, DataForSEO, or SerpAPI, and generate SEO/GEO packs. Missing providers fail soft and must lower confidence honestly.

`project-control/PROVIDER_REALITY_AUDIT.md` is the D-403 provider reality audit evidence rule: local env readiness is not production provider readiness. Never print secrets or claim quota, permission, account, or live-call success from environment-name checks.
