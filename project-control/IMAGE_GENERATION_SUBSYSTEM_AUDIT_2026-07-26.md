# Image-Generation Subsystem Audit

Audit date: 2026-07-26. This report is read-only and architecture-only. No prompt, camera, slot, provider, queue, schema, Media, or production behavior was changed.

## Executive finding

The subsystem is an operational Gemini-first preview pipeline with strong product-fidelity intent, useful deterministic post-processing, Telegram approval, and an explicit downstream Image QC gate. It is not yet a clean multi-provider image platform. The current implementation is concentrated in two very large files, assembles a long overlapping prompt, performs many serial provider calls, stores attempt metadata as JSON strings, accepts partial generations, and has incomplete lineage and retention.

The operator's protected-brand decision changes the earlier audit recommendation: brand classification must not be an image-generation eligibility gate. The active task already follows that rule. The unused `imageBrandGate.ts`, its blocking test, and brand-first generation advice in read-only image plans are rejected legacy policy, not controls to restore. Identity/logo fidelity checks inside generation are different: they compare visible reference facts and may trigger one retry or a warning; they do not classify a product as ineligible.

## Current architecture

```text
Telegram photo / #gorsel / #geminipro / inline action
                         |
                         v
             image-generation-jobs record
                         |
                         v
               Payload image-gen task
     reference load -> footwear validation -> identity lock
                         |
                         v
          five sequential slot generations
       provider checks -> retry once -> post-process
                         |
                         v
             public generated Media records
                         |
                         v
               Telegram preview keyboard
             approve / reject / regenerate
                         |
                         v
         Products.generativeGallery + Image QC
                         |
                         v
           activation / publishing / dispatch gates
```

Primary implementation surfaces:

| Surface | Current responsibility | Audit assessment |
|---|---|---|
| `src/jobs/imageGenTask.ts` | Job orchestration, product/reference loading, provider call, Media persistence, Telegram preview, job state | Too many responsibilities; partial-result indexing is unsafe |
| `src/lib/imageProviders.ts` | Gemini/OpenAI calls, identity extraction, prompt assembly, validation, retries, centering, normalization, overlay, upscale | Large monolith with duplicated provider preparation and stale comments |
| `src/lib/imageSlotContract.ts` | Canonical five-slot contract | Useful contract, but comments and runtime pair behavior disagree |
| `src/lib/imageCentering.ts` | Bounding-box based deterministic centering and legacy pair helper | Valuable deterministic stage; background assumptions can mis-detect |
| `src/lib/imageQualityGate.ts` | Publishability decision for original/generated media | Correctly downstream from generation; human Image QC remains essential |
| `src/collections/ImageGenerationJobs.ts` | Durable job status, relationships, hooks | Attempt and slot metadata are insufficiently structured |
| `src/collections/Media.ts` | Generated/original media persistence | Missing generation lineage, attempt, slot, prompt version, and QC linkage |
| `src/app/api/telegram/route.ts` | Queue entry points, preview callbacks, approve/reject/regenerate UX | High operator value, but tightly coupled and duplicated |

## Providers and abstraction

Gemini is the active operator provider. The image endpoint defaults to `gemini-2.5-flash-image`; Gemini 2.5 Flash is also used for footwear validation, identity extraction, color checking, and visible-brand-zone fidelity checking. The side-orientation helper still references `gemini-2.0-flash` directly.

OpenAI `gpt-image-1` remains as a compatibility path, while the Telegram `#chatgpt` entry point is disabled and regeneration forces Gemini. Both provider functions resemble each other but there is no formal provider interface, registry, capability model, normalized error taxonomy, pricing metadata, timeout policy, or provider-specific concurrency policy. Reference preprocessing and several validation loops are duplicated.

Provider independence is therefore nominal rather than architectural. Adding a provider would require editing orchestration and provider internals instead of registering a capability adapter.

## Queue and job lifecycle

The queue is durable because Payload stores `image-generation-jobs` and runs an `image-gen` task. Vercel cron also invokes the Payload runner every 30 minutes. Telegram entry points often call `jobs.run({ limit: 1 })` immediately after queueing; that call is not tied to the newly created job and may run another queued task.

The task declares zero retries. It marks the job generating, performs the entire five-slot sequence serially, persists any successful output, sends a preview, and then records preview/review state. A successful job means at least one buffer, not a complete canonical slot set. There is no attempt entity, lease/heartbeat, resumable slot checkpoint, cancellation state, dead-letter state, or per-slot retry policy.

The route uses Next `after()` for immediate execution while the route has a 300-second ceiling. That gives durable fallback through Payload/cron, but couples a multi-minute workflow to a webhook invocation and provides weak progress visibility.

## Prompt assembly and locks

The active prompt is assembled in `imageProviders.ts`, not `imagePromptBuilder.ts`. The latter is legacy code containing older lifestyle and text-to-image concepts.

Current assembly combines task framing, multi-reference framing, the extracted identity lock, visible protected zones, the slot scene, the studio standard, material directives, a global material identity lock, visual facts, canonical prohibitions, anti-frame instructions, and optional pair-mode instructions. This captures important constraints, but the blocks repeat instructions and sometimes blur precedence. The result is expensive to inspect, difficult to version, and hard to attribute when output quality changes.

- Material lock: preserves type, undertone, finish, stitching, sole relation, and special suede/nubuck behavior.
- Visual fact lock: forbids invented details by default and accepts capped operator facts.
- Identity lock: extracts product class, color, construction, closures, sole/heel, reference angle, accents, visible branding, and other reference facts.
- Visible protected zones: preserve visible marks/text as reference identity facts. They are fidelity constraints, not a protected-brand eligibility gate.
- Camera: the slot contract leaves exact degrees and crop to the model, while other prompt language implies exact composition. The subsystem therefore does not currently have one authoritative camera contract.

No prompt redesign is proposed in this audit. The immediate architecture need is observability: persist prompt module versions and the final resolved prompt hash so future redesign can be measured.

## Slot generation and composition

The canonical standard contract contains five slots in this order:

1. `side`: single shoe, target coverage 0.82.
2. `hero_3q`: pair, target coverage 0.82.
3. `top`: pair, target coverage 0.82.
4. `back`: single rear three-quarter, target coverage 0.82.
5. `detail`: single macro/detail, target coverage 0.94.

The standard stage requests all five slots; the backward-compatible premium stage requests slots four and five. Some comments, Telegram labels, and environment documentation still say three scenes. Pair slots are currently generated by the model. An older deterministic `makePairShot()` helper remains unused even though comments still describe deterministic duplication/mirroring.

Side orientation is checked separately. A right-pointing shoe may be horizontally flipped with Sharp. That improves consistent direction but can reverse visible text, logos, buckles, or asymmetric construction. Shot-compliance checking exists but is disabled to reduce provider calls and rate pressure.

## Post-processing, scaling, and centering

Both providers mirror-extend references through 768 and then 1024 pixels before generation to reduce frame artifacts. Generated outputs then pass through deterministic centering, background normalization for non-detail slots, stock-number overlay, and upscaling up to 2x with a 2048-pixel cap, sharpening, and JPEG quality 90.

Centering uses a foreground bounding box relative to a studio background and rescales to slot coverage. It is a valuable deterministic control, but the normal path passes a fixed ivory background to the detector even though comments imply corner-sampled background detection. Provider background drift can therefore distort the foreground box. Upscaling changes pixel dimensions but cannot restore missing product detail and can amplify artifacts.

## Validation, failure handling, and retries

The reference is required; no text-only fallback exists. When Gemini credentials are present, a vision check confirms that the reference appears to be footwear. Vision/provider/parse errors fail open. Identity extraction also falls back to a minimal lock.

Each slot can receive a color-fidelity check and, when visible identity zones exist, a separate zone-fidelity check. The side slot also receives orientation analysis. A failed color or identity-zone check triggers one regeneration; a second failure is retained with a warning for operator preview rather than discarded. This is a sensible human-in-the-loop bias, but the warning is not a structured quality score.

The baseline clean five-slot run is approximately 13 provider calls: validation, identity extraction, five generation calls, five color checks, and one side-orientation check. With visible-zone checks it is approximately 18. If every slot retries once with visible-zone checks, the run can approach 33 calls. Calls are serial, include deliberate sleeps, and most provider calls have no explicit timeout. This is the principal performance, quota, and cost bottleneck.

## Storage, lineage, approval, and regeneration

Each successful generated buffer becomes a public generated `Media` record associated with the product. It is not attached to the product gallery until approval. The job stores generated-media relationships and provider/prompt/result data as JSON text.

Telegram previews two to ten images as a media group with individual-send fallback. Approval is positional: selected one-based indices are resolved against the job relationship order. A raw SQL query against Payload's relationship table is retained as a fallback when relationship hydration is empty. Approval appends selected media to `generativeGallery`, narrows the job relationships, sets visual state, and starts the broader product confirmation wizard. Collection hooks also append approved media, creating duplicated responsibility even though deduplication limits double inserts.

Reject marks the job/product state but retains all generated public Media. Regenerate clears job relationships and reuses the same job, forces Gemini, and leaves prior Media behind. Partial approval removes unselected relationships from the job while the Media records remain. There is no defined retention policy or recoverable cleanup workflow.

## Critical correctness issue: compacted partial results

Provider buffers contain only successful slots, while scene indices, names, labels, and contract metadata are derived as if every requested slot succeeded. If a middle slot fails, a later successful image can be labeled and persisted as the wrong slot. Media-save failures can create a second positional mismatch. Telegram may preview an in-memory image whose Media record failed, while approval buttons are based on saved relationships.

This is the highest-priority image correctness defect because it corrupts lineage and can cause the operator to approve the wrong semantic slot. Future work should carry one structured result object per requested slot from generation through persistence and preview.

## Quality bottlenecks

- Prompt modules overlap and have no explicit precedence or independently versioned evaluation history.
- Camera intent is not represented as deterministic, machine-checkable geometry.
- Identity consistency is derived once but evaluated only through color, optional visible zones, and disabled shot compliance.
- Model-generated pairs can diverge in orientation, scale, spacing, or identity.
- Horizontal correction can invert visible text/asymmetry.
- Fixed-background centering assumptions can misclassify foreground.
- Partial results can be mislabeled.
- A retry is all-or-nothing per slot and has no structured defect reason or operator-editable regeneration instruction.
- Human Image QC is product-level and publishing-oriented rather than an attempt/slot scorecard.

## Performance and cost bottlenecks

- Five serial image generations plus serial evaluator calls and sleeps.
- Repeated reference preprocessing in provider paths.
- No capability-aware concurrency or per-provider rate scheduler.
- No call-level timeouts, cancellation, heartbeat, or checkpoint resume for most calls.
- Full-run regeneration is easier than targeted, lineage-preserving slot regeneration.
- 2x post-generation upscale adds CPU/storage without provider-native detail recovery.
- Provider results do not expose normalized token/image/cost/duration accounting.

## Legacy, duplicate, dead, and temporary code

| Item | Classification | Future action, not performed here |
|---|---|---|
| `imageBrandGate.ts` and blocking test | Rejected legacy policy; unused by active task | Remove together after tests/docs no longer depend on them |
| Brand-first generation states in image plan/QC plan | Runtime diagnostic policy contradicting operator decision | Separate generation eligibility from publishing/provenance advice |
| `imagePromptBuilder.ts` | Legacy unused prompt path | Verify imports, then archive/delete in a scoped change |
| `makePairShot()` | Unused deterministic pair experiment | Decide against the future slot contract before removal |
| `checkShotCompliance()` | Disabled evaluator | Either formalize as optional evaluator or remove |
| Preservation/identity helper exports and edge sampler | Apparently unused | Confirm with focused static analysis |
| OpenAI path and OpenAI-only comments | Compatibility code plus stale narrative | Keep adapter intent, correct comments, decide supported status |
| Raw relationship SQL fallback | Schema-coupled temporary hack | Replace with repository/query abstraction |
| JSON-string job metadata | Temporary observability shortcut | Migrate to structured attempt/slot records |
| Three-scene/mode/provider labels | Stale UX/configuration | Align after operator UX design |

## Future extensibility constraints

The next architecture should preserve the reference-first, preview-first, human-QC workflow while separating orchestration, provider adapters, prompt modules, slot specifications, deterministic transforms, evaluators, persistence, and Telegram presentation. It should treat every requested slot as a durable result, store provider/prompt/version/cost lineage, permit targeted regeneration, and keep brand classification outside generation eligibility.

The proposed target architecture and implementation order are documented in `project-control/TELEGRAM_FIRST_IMAGE_ARCHITECTURE_2026-07-26.md`.
