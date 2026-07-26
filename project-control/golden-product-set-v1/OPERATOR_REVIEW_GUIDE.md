# Operator review guide

## Review objective

Confirm only what the original reference and operator knowledge support. The review creates attributable product truth; it is not a quality vote on a generated image. Human review is authoritative, and uncertainty is an acceptable result.

## Per-product workflow

1. Verify the source path/hash and confirm it is an original non-generated reference for an owned product with permitted internal benchmark use.
2. Review privacy and metadata findings. Reject or sanitize sources containing customer identity, private locations, credentials, signed URLs, unrelated people, identifying reflections, or EXIF/GPS.
3. Confirm, correct, or dispute the product family and confusion candidates.
4. Walk every Reference Sufficiency Map region. Change `not_visible` to an observed state only when another recorded original supports it.
5. Review every fact by provenance. A visually inferred fact remains inferred until explicitly confirmed; a Payload value is not automatically verified.
6. Build the Product Identity Fingerprint only from effective facts and critical unknowns.
7. Add only operator-verified facts to the Locked Fact Set. Preserve prohibited assumptions and unknowns.
8. Review expected risks/checks as benchmark expectations, not runtime blockers.
9. Record operator notes, reviewer ID, timestamp, version, and change reason. Append history; do not replace it.
10. Move to `reviewed`, then separately to `approved` only when source rights/product linkage and identity-critical facts are acceptable.

## State transitions

`draft → needs_review → reviewed → approved` is the normal path. Any state may move to `disputed` when evidence conflicts. A new revision may resolve a dispute. `superseded` preserves an old source or annotation after replacement. Reverting a decision creates another history event; it does not delete the prior event.

Machine or repository-audit actors may create drafts and recommendations. They may not set `reviewed` or `approved`, populate human reviewer attribution, or lock facts on behalf of an operator.

## Dedicated loafer protocol

For every proposed loafer, review these dimensions separately:

| Dimension | Review question |
|---|---|
| Family identity | Is a closed-back slip-on loafer actually supported, or could this be a mule, slipper, moccasin, or formal lace-up? |
| Toe geometry | Rounded, square, elongated, tapered, or unknown? Which view supports it? |
| Vamp length | Is the extended vamp visible and how much is viewpoint interpretation? |
| Opening shape | Is the collar/opening fully visible; is the back definitely closed? |
| Apron seam | Is an apron path present, absent by evidence, subtle, partial, or unknown? |
| Heel/back | Is rear construction visible enough to prevent mule conversion? |
| Sole | What edge profile and thickness are supported; is the outsole unknown? |
| Ornament topology | Is there a penny strap, tassel, bit, buckle, loop, or no evidenced ornament? |
| Hardware | Is metal truly visible, verified absent, or ambiguous? |
| Stitch/metal confusion | Could a stitched loop, reflection, or shadow be interpreted as hardware? |
| Conversion risks | Record mule, slipper, moccasin, and formal-lace-up risks independently. |
| Pair/handedness | Are both shoes visible, are left/right identities stable, and is symmetry supported? |
| Scale/framing | Is occupancy stable enough for comparison without treating crop as product truth? |

For each row, separate source-supported observation, reviewer interpretation, uncertainty, and future expected checks. Do not use a profile default to fill a missing heel, ornament, or outsole.

## Source replacement

Create a new reference ID and hash, record why it replaces the old source, mark the old reference/annotation superseded, increment selection and annotation versions as applicable, and rerun duplicate/privacy/integrity validation. If the replacement changes effective facts, create a new fingerprint and Locked Fact Set; historical results retain the old digests.

## Blind provider/prompt comparison

The evaluation coordinator pins product, reference, understanding, profile, prompt-module, slot-purpose, and evaluation versions. Outputs are shuffled and provider/prompt/profile identities hidden. Reviewers first score each semantic slot for identity, then the pack for consistency, then aesthetics. Every rejection uses failure codes and confidence. Ties and abstentions are valid. Decisions are sealed before unblinding; latency and cost are reported separately.

Holdout detailed annotations stay with the operator or independent evaluator. Developers receive only IDs, distribution, and sealed aggregate results while tuning. A holdout source must never also appear in calibration under another path or transformed copy.
