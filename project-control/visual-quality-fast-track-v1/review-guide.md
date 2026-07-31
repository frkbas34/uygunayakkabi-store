# Visual Quality Fast Track V1 Review Guide

This guide fixes the human-review method for the Mini Golden Set V0. It is evidence guidance, not runtime policy and not an automatic publish gate.

## Evidence order

1. Review every original reference at full resolution before viewing generated outputs.
2. Record only visible facts. A missing angle is `unknown`, not inferable evidence.
3. Review generated slots in canonical order: `side`, `hero_3q`, `top`, `back`, `detail`.
4. Compare each slot to the references, then compare all five slots to one another.
5. Treat a provider or runtime check as supporting metadata only. Human-visible contradiction wins.
6. Score the retained generated Media even when the operator rejected the preview; rejection is not deletion.

## Score scale

- `5` — faithful and professionally usable for the dimension.
- `4` — minor visible deviation that does not change product identity.
- `3` — material ambiguity or moderate drift; review required.
- `2` — severe drift or a slot-purpose failure.
- `1` — product identity is mostly lost.
- `0` — missing, unusable, or contradictory output.

Every score of `3` or lower must have a structured failure entry containing the affected dimension, at least one stable failure code, and a direct observation. `severeArtifactCount` uses the same positive direction: `5` means no severe artifact; lower scores mean more or worse artifacts.

## Scored dimensions

Product identity: `sameProductAsReference`, `sameProductAcrossAllFiveSlots`, `silhouettePreservation`, `categoryPreservation`, `materialPreservation`, `colorPreservation`, `hardwareOrnamentPreservation`, `seamConstructionPreservation`.

Geometry and framing: `toeGeometry`, `vampLength`, `openingShape`, `heelBackGeometry`, `soleThickness`, `productScale`, `centering`, `canvasOccupancy`, `orientationConsistency`, `perspectiveConsistency`.

Pack: `crossSlotCoherence`, `duplicateRedundantImagery`, `usefulnessOfSlotPurpose`, `professionalSetAppearance`, `severeArtifactCount`.

Loafer addendum: `noMuleConversion`, `noSlipperConversion`, `noMoccasinDrift`, `noOxfordFormalLaceConversion`, `noInventedTasselStrapMetal`, `apronSeamStability`, `vampStability`.

## Stable failure codes

`IDENTITY_DRIFT`, `CATEGORY_CONVERSION`, `SILHOUETTE_DRIFT`, `TOE_GEOMETRY_DRIFT`, `VAMP_LENGTH_DRIFT`, `OPENING_SHAPE_DRIFT`, `HEEL_BACK_DRIFT`, `SOLE_THICKNESS_DRIFT`, `SEAM_PATH_DRIFT`, `HARDWARE_INVENTED`, `ORNAMENT_INVENTED`, `MATERIAL_DRIFT`, `COLOR_DRIFT`, `SCALE_INCONSISTENT`, `CENTERING_INCONSISTENT`, `ORIENTATION_INCONSISTENT`, `PERSPECTIVE_INCONSISTENT`, `SLOT_REDUNDANT`, `PACK_INCOHERENT`, `PROVIDER_ARTIFACT`.

## Interpretation boundary

- Direct observation belongs in `observation`.
- A likely architectural cause belongs in the report's root-cause map and must be labelled likely.
- A change proposal belongs only in the Visual Lock V0 hypothesis.
- Do not infer that Gemini, a prompt fragment, centering, or another layer caused a failure merely because the failure is visible.
- Generated image binaries remain outside Git. Project-control evidence uses internal Product, Job, Attempt, Media, and semantic-slot identifiers only.
