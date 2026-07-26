# AI Images, GEO, and Product Intelligence

## Image generation

The active operator engine is Gemini image generation. `#gorsel`, `#geminipro`, and image buttons queue `imageGenTask` (`image-gen`) with `provider=gemini-pro`; `#chatgpt` is disabled. The job retains an OpenAI `gpt-image-1` path for legacy/explicit compatibility, but current regeneration redirects to Gemini.

The standard stage requests five slots: side, hero three-quarter pair, top pair, rear three-quarter, and detail. The premium compatibility stage requests slots four and five. A real reference photo is mandatory. Gemini Vision validates the input and extracts an identity lock; generation applies slot instructions, material and visual-fact locks, optional fidelity retries, deterministic centering/background normalization, stock-number overlay, and upscaling before Media persistence.

Generated Media is previewed in Telegram and remains separate from original media. Approval appends selected records to `generativeGallery`. Explicit Image QC PASS is required before generated media is publishable.

Protected-brand classification must never block generation. The active task already bypasses the unused blocking helper. Brand safety still applies to claims, operator approval, activation, publishing, advertising, Shopier, and external dispatch. Visible-mark checks inside the provider path are reference-fidelity evaluators, not classification gates.

Known bottlenecks:

- Partial slot or Media-save failure can compact results and associate a later image with the wrong slot metadata.
- A clean five-slot run uses roughly 13 serial provider calls and can rise toward 33 with visible-zone checks and one retry per slot; most calls lack explicit timeouts.
- Provider functions share a shape but there is no formal capability adapter, normalized error/usage model, or cost/latency budget.
- Prompt blocks overlap and are not independently versioned; camera authority and pair-shot comments disagree with runtime behavior.
- Comments and labels disagree about three-slot versus five-slot output and the default provider.
- Rejected/regenerated/partially approved previews can leave orphan Media.
- Approval/regeneration is positional, reuses jobs, and does not preserve immutable attempt history.
- `imagePromptBuilder.ts` is legacy and is not the active prompt path.
- Automatic fidelity checks and deterministic post-processing reduce defects but do not replace human QC.

The proposed evolution separates orchestration, provider adapters, versioned prompt modules, durable slot results, deterministic transforms, evaluators, immutable attempts, Media retention, and Telegram task presentation. Future style packs, profiles, quality scores, and evaluation loops build on that lineage. No prompt, camera, slot, or provider redesign has been implemented.

`project-control/IMAGE_GENERATION_BLUEPRINT_V1.md` is the canonical target technical specification for future implementation. Current code and dated audits remain authoritative for current behavior.

`project-control/PRODUCT_UNDERSTANDING_LAYER_V1.md` is the canonical pre-prompt design beneath that blueprint. It defines a practical footwear taxonomy, evidence and uncertainty, original-reference sufficiency, versioned operator overrides, a locked Product Identity Fingerprint, Generation Profile resolution, and reviewed failure learning. It is architecture only: no classifier, profile, prompt, camera, slot, provider, or runtime behavior has been implemented.

`project-control/VISUAL_CONSISTENCY_ENGINE_V1.md` is the canonical layer after Product Understanding. It defines a provider-neutral Digital Product Identity and Identity Anchor, versioned product/pack/slot/regeneration contracts, geometry and bounding metadata without deterministic cropping, durable non-compacted slot results, asset Visual Fingerprints, advisory identity-drift vectors, and a loafer-heavy Golden Product Set proposal. No consistency engine, drift evaluator, prompt, camera, slot, provider, crop, or runtime behavior has been implemented.

`project-control/GOLDEN_PRODUCT_SET_V1.md` and `project-control/golden-product-set-v1/` now materialize the local corpus contracts, inventories, failure taxonomy, review protocol, schemas, validator, and one evidence-conservative draft lifestyle-sneaker annotation. Readiness is blocked: 1 draft candidate, 0 operator-approved products, and 0 loafers against the 36-product/12-loafer target. Generated outcomes remain a separate future archive and never define product identity.

## Product Intelligence and GEO

Product Intelligence can analyze product images/text, use Gemini, optionally perform reverse search through Google Vision, DataForSEO, or SerpAPI, and generate SEO/GEO packs. Missing providers fail soft and must lower confidence honestly.

`project-control/PROVIDER_REALITY_AUDIT.md` is the D-403 provider reality audit evidence rule: local env readiness is not production provider readiness. Never print secrets or claim quota, permission, account, or live-call success from environment-name checks.
