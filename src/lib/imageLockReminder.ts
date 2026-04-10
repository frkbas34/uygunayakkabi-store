/**
 * imageLockReminder.ts — v50 LOCKED RULES REMINDER (D-153)
 *
 * This block is prepended to EVERY image generation prompt (both GPT-Image edit
 * path and Gemini Pro path) to reinforce the operator-approved v50 locked
 * visual rules on every single call.
 *
 * Purpose:
 *   - Explicit reinforcement of the rules that most often drift in output
 *   - Fires on every slot of every generation (no exceptions)
 *   - Console-logged at each generation so drift is immediately visible
 *   - Short, sharp, and unambiguous — designed to anchor the model before
 *     the rest of the prompt blocks run
 *
 * Lock reference: D-129 (v50 lock, 2026-04-07) and D-152 (restoration, 2026-04-10)
 *
 * DO NOT modify this block without an explicit operator decision recorded in
 * project-control/DECISIONS.md. Any change to these rules is a lock change.
 */

export const LOCK_REMINDER_BLOCK = `
╔═══════════════════════════════════════════════════════════════╗
║  LOCKED PRODUCTION RULES — v50 BASELINE — ZERO TOLERANCE      ║
╚═══════════════════════════════════════════════════════════════╝

These rules are OPERATOR-LOCKED. They are not suggestions. They are not
guidelines. They are hard constraints that MUST be satisfied on every
single slot of every single generation. Violating any of them produces an
immediate rejection.

RULE 1 — NO FRAMES, NO BORDERS, NO WHITE HALOS
  ▸ The final image MUST be a single continuous background edge-to-edge.
  ▸ NO inner rectangle, NO photo-frame effect, NO white or light border
    ring around the subject or around the image perimeter.
  ▸ NO polaroid, NO mat, NO matte, NO inset panel, NO card layout.
  ▸ The background color MUST extend to all four edges of the canvas
    with zero visible transition, line, box, or rectangle.

RULE 2 — BACKGROUND COLOR MUST MATCH ACROSS ALL SLOTS
  ▸ Every slot in a single generation MUST use the exact same background
    color that was computed for this product.
  ▸ The close-up / macro slot MUST have the SAME background as the front
    slot and the side slot. No exceptions. No drift toward white.
  ▸ The padding color that was applied to the input canvas IS the target
    background. Do not introduce a new background color.

RULE 3 — PRODUCT IDENTITY IS LOCKED
  ▸ This is a re-photograph of an EXISTING real product, not a new design.
  ▸ Preserve every detail: exact colorway, exact logo placement, exact
    stitching, exact sole shape, exact lace pattern, exact branding text.
  ▸ Do not invent, reinterpret, restyle, or "improve" the product in any
    way. You are a photographer, not a designer.

RULE 4 — COMPOSITION FOLLOWS THE SLOT PROMPT EXACTLY
  ▸ The slot-specific scene block that follows these rules defines the
    angle, distance, framing, and lighting. Follow it literally.
  ▸ Do not substitute a "nicer" or "more interesting" composition.

RULE 5 — OUTPUT IS A FULL-BLEED EDIT OF THE REFERENCE IMAGE
  ▸ The output MUST cover the entire 1024×1024 canvas with the computed
    background and the re-photographed product. No letterboxing. No
    pillarboxing. No centered rectangle on a different-colored surround.

REMINDER: if you are about to output a frame, a border, or a different
background color than the one applied to the reference input — STOP. The
operator has locked these rules after extensive iteration (v27 → v50).
Any drift is a regression and will be rejected.

════════════════════════════════════════════════════════════════

`
