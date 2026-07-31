# Visual Lock V0 Implementation V1

Date: 2026-08-01

Status: local implementation checkpoint; not pushed or deployed

## Baseline evidence used

The implementation is the single controlled hypothesis authorized by [`VISUAL_QUALITY_FAST_TRACK_BASELINE_V1.md`](VISUAL_QUALITY_FAST_TRACK_BASELINE_V1.md). The measured current-profile packs showed clean isolation and broad color/category preservation, but recurring cross-slot drift in toe, vamp, opening, heel, sole, seam paths, eyelets, ornament topology, scale, and back orientation. Product 349 also showed pressure from a closed-back loafer toward a generic moccasin/slipper form. Product 343 showed that a generic slip-on can retain broad identity while still changing component geometry.

No new production image or provider evidence was created for this implementation.

## Exact hypothesis

If every slot receives one identical, canonical Product Identity Anchor plus explicit cross-slot, framing, and orientation locks—and confirmed loafers receive one additional family lock—then cross-slot product coherence should improve without changing the provider, slot set, retry behavior, transforms, or ordinary `#gorsel <id>` prompt output.

Visual Lock V0 is explicitly opt-in. It is not a new default and does not perform automatic family classification.

## Contract versions

- Profile: `visual-lock/v0`
- Command selector: `visual-lock-v0`
- Generic identity anchor: `product-identity-anchor/v0`
- Loafer family lock: `loafer-identity-lock/v0`
- Framing contract: `visual-framing-lock/v0`
- Existing semantic slot contract: unchanged
- Existing slot prompt version: unchanged

## Implementation files

- `src/lib/imageVisualLockV0.ts` — pure profile, identity-anchor, prompt-block, digest-fixture, task-selection, and command-decision contracts
- `src/lib/imageProviders.ts` — optional V0 block insertion in both existing provider paths
- `src/jobs/imageGenTask.ts` — existing task-input JSON carrier, anchor construction, and existing job/attempt JSON metadata
- `src/lib/imageGenerationContracts.ts` — optional fields inside the existing `generationAttempts` JSON object
- `src/app/api/telegram/route.ts` — controlled private-DM selector and regeneration preservation
- `src/lib/imageVisualLockV0.test.ts` — deterministic sanitized fixtures and 24 focused checks
- `package.json` — focused test script and `test:safe` inclusion
- `project-control/VISUAL_LOCK_V0_IMPLEMENTATION_V1.md` — this report

No Payload collection field, migration, database table, or Source Pack file was added or changed.

## Product Identity Anchor

The anchor is canonical JSON with a SHA-256 digest. It is built after the existing identity extraction and before generation, without another provider call. It combines:

- explicit operator-selected family;
- existing identity-extraction fields;
- D-355M material evidence;
- D-355N visual-fact evidence;
- optional operator-verified visual facts;
- explicit unknown values for unsupported facts.

The structured facts cover silhouette, toe, vamp/upper proportions, opening, heel/back, sole, material zones, color zones, seam paths, hardware, ornament, and laces/eyelets. Laces/eyelets are carried only when operator facts or source-derived closure evidence supports them. Unknown facts serialize as `unknown`; the prompt explicitly forbids inferring hidden structure.

Every slot receives the byte-identical serialized anchor and the same anchor hash. Only the slot orientation block differs.

## Cross-slot and framing locks

Every V0 prompt states that all five outputs depict the exact same physical shoe and form one coherent product-photography pack. Only camera/presentation purpose may change; geometry, topology, component size, and component placement may not.

The prompt-only framing contract requires:

- 72–82% complete-product occupancy of usable canvas;
- visual center within 3% of canvas center;
- consistent apparent scale and margin family;
- no extreme zoom or distant product;
- no cut-off toe, heel, or sole.

The existing deterministic centering, background normalization, stock-number overlay, upscale, retry, and transform code is unchanged.

## Slot orientation authority

The five existing semantic IDs and purposes are unchanged:

- `side` — true controlled lateral presentation;
- `hero_3q` — controlled hero three-quarter presentation;
- `top` — controlled overhead presentation;
- `back` — true rear, heel-centered presentation; rear-three-quarter substitution is forbidden;
- `detail` — only a source-supported detail may be emphasized, with identity and topology unchanged.

No lifestyle scene, slot, or camera redesign was introduced.

## Loafer Identity Lock

`family=loafer` adds preservation rules for toe width/profile, vamp length, opening, apron seam, heel/back construction, sole thickness/edge, hardware/ornament topology, and stitching. It explicitly forbids conversion to mule, slipper, generic moccasin, Oxford/Derby, lace-up shoe, sandal, or sneaker. Tassels, penny straps, buckles, metal, laces, eyelets, and pull tabs may not be added unless reference evidence confirms them.

## Generic behavior

`family=generic` receives the Product Identity Anchor, cross-slot invariant, framing lock, and slot orientation authority. It receives no loafer-specific assumptions or family-conversion vocabulary. This keeps category-uncertain and non-loafer products, including the Product 343-style sanitized fixture, evidence-led.

## Operator command and authorization

Accepted syntax in the real private chat with Uygunops:

```text
#gorsel <product-id> --profile=visual-lock-v0 --family=loafer
#gorsel <product-id> --profile=visual-lock-v0 --family=generic
```

V0 fails closed unless all are true:

- private chat;
- Uygunops webhook/role;
- sender is on the non-empty operator allowlist;
- no bot-mention prefix;
- known profile and family;
- exact command shape.

Group/supergroup, GeoBot, mention-prefixed, open-allowlist, unknown-profile, unknown-family, and malformed variants cannot queue a V0 job. Ordinary `#gorsel <id>` remains on the existing default path.

## Prompt and metadata integration

The optional V0 block is inserted into the actual `imageProviders.ts` prompt assembly after D-355M/D-355N and before canonical prohibitions. When no V0 context exists, the inserted value is the empty string, preserving the existing prompt bytes.

The existing Payload task-input JSON carries `qualityProfile` and `productFamily`. The existing job `promptsUsed` JSON records command profile, canonical profile version, family, identity-anchor version/hash, framing version, and optional family-lock version. The existing `generationAttempts` JSON records the canonical profile, family, hash, and contract versions. Regeneration recovers the selector/family from `promptsUsed`; no schema field is needed.

Raw assembled prompts and the serialized identity anchor are not sent to Telegram.

## Deterministic prompt digests

- Existing default five-scene digest: `4050a83f01eae0c200b013ce9fc744b41890f49180cb1af0e2173e2a38adb810`
- Sanitized V0 five-block fixture digest: `f6d25f7e4980c731c9e191bd6bfd7f9ee3ae104ac927f67bdb64ac77ae00238d`
- Sanitized loafer identity-anchor fixture hash: `93ce6234897bd89b141d8c8683de7d1882dc7ee2cdd2048f4735f8b8b7826b36`

The V0 fixture contains no production credentials, product IDs, URLs, Telegram identifiers, or image binaries.

## Focused test coverage

The 24 deterministic checks cover default digest/command stability, private allowlisted Uygunops activation, group/supergroup/mention/profile/family rejection, shared anchor hash and serialization, cross-slot/framing/orientation locks, true-back authority, loafer and generic behavior, unknown preservation, D-355M/D-355N presence, unchanged provider/slot/retry/transform contracts, no collection schema field, no added provider call, existing metadata persistence, and deterministic V0 digests.

The required broader contract, Telegram parser, type, lint, safe-suite, validation, and diff checks are recorded in the checkpoint handoff after execution.

## Unchanged behavior

- default `#gorsel <id>` command and prompt bytes;
- Gemini-first provider selection and models;
- one existing validation call and one existing identity-extraction call;
- five semantic slots, IDs, order, purpose, and pair/single layout;
- retry count and failure handling;
- centering/background/overlay/upscale transforms;
- approval, rejection, gallery, Media, publishing, Shopier, and brand eligibility behavior;
- Payload collection schema and production data.

## Known limitations

- V0 is prompt-contract enforcement, not geometric measurement or post-generation scoring.
- Family selection is manual and supports only `loafer` and `generic`.
- Anchor completeness is bounded by existing source evidence. Side-only references leave top/back facts unknown.
- Existing identity extraction does not expose a fully normalized seam graph or component counter; V0 preserves explicit evidence but does not invent either.
- No claim is made yet that V0 improves production quality. That requires the separately authorized A/B pilot.

## Exact A/B pilot plan

1. Keep provider, model, references, slot set, retries, transforms, and operator unchanged.
2. Use the prior rejected current-profile packs as control evidence; do not regenerate the control merely to create a comparison.
3. Operator manually runs one private-DM V0 loafer command for the designated Product 349 pilot and one private-DM V0 generic command for the designated Product 343 pilot, only after a fresh read-only preflight and explicit production authorization.
4. Observe one job/attempt per product and verify exact five-slot lineage and recorded profile/family/hash before review.
5. Score the V0 packs using the existing baseline review guide and the same dimensions.
6. Compare cross-slot coherence, same-product score, orientation compliance, occupancy spread, center offset, topology invention, toe/vamp/sole drift, and professional pack coherence against the committed baseline.
7. Pass the hypothesis only if the documented targets are met without default-path regression or extra provider activity; otherwise reject or revise V0 locally.
8. Do not approve, publish, dispatch, or attach a gallery asset as part of measurement unless a later human checkpoint explicitly authorizes it.

Exact next task: **VISUAL LOCK V0 — CONTROLLED PRODUCTION A/B PILOT**.
