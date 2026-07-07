/**
 * imageSlotContract — D-407 CENTRAL 5-SLOT GENERATED-IMAGE CONTRACT
 *
 * Single source of truth for the fixed 5-slot generated-image system.
 *
 * WHAT IS FIXED (locked by this contract):
 *   1. The 5 slot types (keys)
 *   2. The slot order (deterministic, index 0..4)
 *   3. The visual centering / framing discipline (shared, every slot)
 *
 * WHAT IS DELIBERATELY NOT FIXED (operator rule — D-407):
 *   - Exact camera angles, degree values, strict camera geometry, exact crop.
 *   - The model / cloud provider chooses the best exact composition for each slot,
 *     inside the centered/consistent/aligned discipline below.
 *
 * This module produces `EDITING_SCENES`-compatible scene objects
 * ({ name, label, sceneInstructions }) consumed by imageProviders.ts, so the
 * whole generation pipeline (identity lock, material lock, visual fact lock,
 * anti-frame, prohibitions) is preserved unchanged — only the slot definitions
 * are centralised here.
 *
 * Generated images stay separate from original product photos: they are written
 * to product.generativeGallery (marketing lane), never to product.images.
 *
 * DO NOT change the slot keys or order without an operator decision recorded in
 * project-control (this is a contract change, downstream metadata depends on it).
 */

// ─────────────────────────────────────────────────────────────────────────────
// Prompt / contract version — stamped onto every generated image's metadata.
// Bump when the slot scene wording or the slot set changes materially.
// ─────────────────────────────────────────────────────────────────────────────
export const SLOT_PROMPT_VERSION = 'slotset-v1'

// ─────────────────────────────────────────────────────────────────────────────
// Canonical slot keys — FIXED order. Index === position in the generated set.
// ─────────────────────────────────────────────────────────────────────────────
export const GENERATED_SLOT_KEYS = [
  'hero_3q',
  'side',
  'top',
  'back',
  'detail',
] as const

export type SlotKey = (typeof GENERATED_SLOT_KEYS)[number]

export type SlotDefinition = {
  /** Deterministic position in the generated set (0..4). */
  index: number
  /** Canonical machine key — stable, used in metadata + filenames. */
  key: SlotKey
  /** Turkish operator-facing label shown in Telegram/admin. */
  label: string
  /** Plain-language meaning of what this slot presents. */
  meaning: string
  /**
   * Loose composition INTENT for this slot. Describes the GOAL only — never a
   * hardcoded angle/degree/geometry. The model picks the exact best composition.
   */
  compositionIntent: string
  /**
   * D-408: deterministic centering lock. Target fraction of the canvas the
   * product's longer side must occupy after post-process normalization. Same
   * value family across the full-shoe slots = equal scale + centering in every
   * slot. The tight material detail intentionally fills more of the frame.
   */
  frameCoverage: number
  /**
   * D-416: 'single' = one shoe (normal). 'pair' = show BOTH shoes. The model
   * still generates ONE shoe; the pair is built deterministically post-process by
   * duplicating + mirroring it (left/right foot), so the two are 100% identical.
   */
  layout: 'single' | 'pair'
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared FRAMING & CENTERING discipline — appended to EVERY slot scene.
// This is the third fixed thing in the contract: the centering/framing rule.
// Intentionally geometry-free (no degrees, no exact crop) — it fixes DISCIPLINE,
// not composition.
// ─────────────────────────────────────────────────────────────────────────────
export const CENTERING_FRAMING_BLOCK =
  `── FRAMING & CENTERING DISCIPLINE (ALL SLOTS — MANDATORY) ──\n` +
  `• The product MUST be visually centered in the frame, the same centered placement in every slot.\n` +
  `• The shoe MUST NOT drift unpredictably left, right, up, or down between slots.\n` +
  `• Keep the product at a roughly consistent visual scale across all slots (similar occupied area) so the whole set feels aligned, stable, and intentionally structured.\n` +
  `• Same background family, same lighting family, same product identity across all 5 slots.\n` +
  `• You MAY choose the best exact crop, angle, and composition FOR THIS SLOT — but always inside this centered, consistent, aligned discipline. Do NOT hunt for a dramatic or unusual composition.\n`

// ─────────────────────────────────────────────────────────────────────────────
// The 5 canonical slots — FIXED types + FIXED order.
// ─────────────────────────────────────────────────────────────────────────────
export const GENERATED_SLOTS: readonly SlotDefinition[] = [
  {
    index: 0,
    key: 'hero_3q',
    label: 'Slot 1 — 3/4 Hero',
    meaning: 'Main hero — three-quarter (front + one side visible together) presentation.',
    compositionIntent:
      `PAIR SHOT: show BOTH shoes of the pair — the LEFT and the RIGHT foot of the SAME shoe model — together at a THREE-QUARTER hero angle, side by side on the studio background. ` +
      `The two shoes are the matched pair of the exact same product: IDENTICAL colour, material, stitching, logo, stripes, sole and every detail — mirror-matched left/right feet, not two different shoes. ` +
      `Arrange them as a natural premium catalog pair (close together, slightly angled), the front and one side of each visible. This is the main dimensional hero.`,
    frameCoverage: 0.82,
    layout: 'pair',
  },
  {
    index: 1,
    key: 'side',
    label: 'Slot 2 — Yan (Side)',
    meaning: 'Side presentation of the shoe.',
    compositionIntent:
      `Present this shoe from the SIDE so its full silhouette and profile read clearly from toe to heel. ` +
      `Choose whatever exact side framing reads best; keep the whole shoe visible.`,
    frameCoverage: 0.82,
    layout: 'single',
  },
  {
    index: 2,
    key: 'top',
    label: 'Slot 3 — Üstten (Top)',
    meaning: 'Top overview — the product seen from above (opening, topline, closure).',
    compositionIntent:
      `PAIR SHOT: show BOTH shoes of the pair from ABOVE (clean top-down view) — the LEFT and the RIGHT foot of the SAME shoe model, side by side as a matched catalog pair. ` +
      `The two shoes are IDENTICAL colour, material, stitching, logo, stripes, sole and every detail — the matched left/right pair of the exact same product, not two different shoes. ` +
      `Arrange them close together as a natural top-down pair; the opening, topline and closure of each visible.`,
    frameCoverage: 0.82,
    layout: 'pair',
  },
  {
    index: 3,
    // D-414: was a flat straight-on "dead-back" (operator: static/ugly, over-
    // emphasises rear brand logos). Changed to a rear THREE-QUARTER angle — the
    // heel + one side together, dimensional and premium. Key stays 'back'.
    key: 'back',
    label: 'Slot 4 — Arka 3/4 (Rear)',
    meaning: 'Rear three-quarter — heel and one side visible together (dimensional, not a flat dead-back).',
    compositionIntent:
      `Present this shoe from a REAR THREE-QUARTER angle — the heel/back AND one side visible together, so the back reads in a dimensional, premium, catalog way. ` +
      `This is NOT a flat straight-on dead-back, and NOT a tight close-up: show the WHOLE shoe from behind-and-to-one-side. ` +
      `Choose whatever exact rear-three-quarter framing reads best. If the reference does not clearly show the back, keep the heel plain and consistent with the visible material and colour — do NOT invent rear seams, panels, logos, or details.`,
    frameCoverage: 0.82,
    layout: 'single',
  },
  {
    index: 4,
    key: 'detail',
    label: 'Slot 5 — Malzeme Detayı (Detail)',
    meaning: 'Close detail of material / stitching / texture / sole edge.',
    compositionIntent:
      `Present a CLOSE, honest DETAIL of the real material — texture, stitching, grain, or sole edge — that is clearly visible in the reference. ` +
      `The chosen detail should fill most of the frame so it reads as a material close-up, not a distant shot. ` +
      `SHARPNESS (MANDATORY): tack-sharp, crisp macro focus on the material surface — the suede nap / leather grain, the stitch thread, and the edges must be in clear focus with fine micro-detail. Do NOT produce a soft, blurred, smeared, or low-detail close-up. ` +
      `Choose whatever exact close framing reads best; show ONLY detail that actually exists in the reference.`,
    // Intentionally high: the detail already fills the frame, so the centering
    // normalizer will typically skip it (skipIfCoverageAbove) and leave it full-bleed.
    frameCoverage: 0.94,
    layout: 'single',
  },
] as const

// ─────────────────────────────────────────────────────────────────────────────
// Scene instruction builder — turns a slot definition into an
// EDITING_SCENES-compatible `sceneInstructions` string (with {COLOR},
// {BACKGROUND}, {REF_ANGLE} placeholders resolved downstream in imageProviders).
//
// Geometry-free by design: composition intent + centering discipline + identity
// safety. All the heavy identity/material/fact/anti-frame locks are appended by
// the pipeline around this text — this string is only the per-slot scene.
// ─────────────────────────────────────────────────────────────────────────────
export function buildSlotSceneInstructions(slot: SlotDefinition): string {
  return (
    `── SLOT ${slot.index + 1}: ${slot.key.toUpperCase()} — ${slot.meaning} ──\n` +
    `Re-photograph this EXACT {COLOR} shoe as the "${slot.key}" slot — the SAME physical object, studio only.\n` +
    `${slot.compositionIntent}\n` +
    `COMPOSITION FREEDOM: The exact angle, crop, and composition for this slot are YOURS to choose — pick the one that best serves the slot's purpose above. Do NOT force a specific degree or rigid geometry.\n` +
    `REFERENCE-SAFE (MANDATORY): Reproduce ONLY details that are clearly visible in the reference image(s). Do NOT invent, add, or remove any part, panel, strap, buckle, lace, eyelet, logo, brand text, or ornament. Keep the exact material, colour, sole, stitching, and silhouette.\n` +
    `BACKGROUND: {BACKGROUND} — the SAME seamless soft warm ivory studio backdrop as every other slot. A clean studio backdrop, NOT a floor, tabletop, outdoor, or lifestyle scene.\n` +
    CENTERING_FRAMING_BLOCK +
    `ANTI-FRAME: Full-bleed photograph that fills the ENTIRE canvas edge to edge. No border, frame, card, tile, shadow-box, or picture-inside-picture. The background must extend to all four edges.\n` +
    `COLOR: The shoe is {COLOR}. Output MUST be {COLOR}. Other colours = REJECTED.\n` +
    `DO NOT simply copy the reference angle ({REF_ANGLE}) — compose the best "${slot.key}" shot for this slot.`
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// EDITING_SCENES-compatible export — the pipeline imports this as EDITING_SCENES.
// Order is the canonical slot order; index i === slot i.
// ─────────────────────────────────────────────────────────────────────────────
export type GeneratedScene = {
  name: SlotKey
  label: string
  sceneInstructions: string
}

export const GENERATED_SCENES: readonly GeneratedScene[] = GENERATED_SLOTS.map(
  (slot) => ({
    name: slot.key,
    label: slot.label,
    sceneInstructions: buildSlotSceneInstructions(slot),
  }),
)

// ─────────────────────────────────────────────────────────────────────────────
// Lookup / ordering helpers
// ─────────────────────────────────────────────────────────────────────────────

export function isValidSlotKey(key: unknown): key is SlotKey {
  return typeof key === 'string' && (GENERATED_SLOT_KEYS as readonly string[]).includes(key)
}

export function getSlotByIndex(index: number): SlotDefinition | undefined {
  return GENERATED_SLOTS.find((s) => s.index === index)
}

export function getSlotByKey(key: string): SlotDefinition | undefined {
  return GENERATED_SLOTS.find((s) => s.key === key)
}

/**
 * D-408: the locked centering coverage for a slot index. Falls back to the
 * full-shoe default (0.82) for any out-of-range index so normalization is never
 * skipped by a bad lookup.
 */
export function frameCoverageForIndex(index: number): number {
  return getSlotByIndex(index)?.frameCoverage ?? 0.82
}

/**
 * D-416: the layout for a slot index — 'pair' means the generated single shoe is
 * duplicated + mirrored into a pair post-process. Defaults to 'single'.
 */
export function slotLayoutForIndex(index: number): 'single' | 'pair' {
  return getSlotByIndex(index)?.layout ?? 'single'
}

/**
 * Deterministically order any collection of slot-tagged items by the canonical
 * slot order. Items whose slotKey is unknown are kept, appended in stable order
 * AFTER the known slots (so a legacy/odd item never silently disappears).
 * Used to guarantee preview/gallery rendering respects the fixed slot order.
 */
export function orderBySlot<T>(items: T[], keyOf: (item: T) => string | null | undefined): T[] {
  const rank = (item: T): number => {
    const slot = getSlotByKey(keyOf(item) ?? '')
    return slot ? slot.index : GENERATED_SLOT_KEYS.length
  }
  // Stable sort: decorate with original index to preserve order within equal ranks.
  return items
    .map((item, i) => ({ item, i, r: rank(item) }))
    .sort((a, b) => (a.r - b.r) || (a.i - b.i))
    .map((x) => x.item)
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-image metadata record — stored on the generation job (in existing JSON
// fields) so every generated image carries: slotIndex, slotKey, promptVersion,
// productId, sourceImageId.
// ─────────────────────────────────────────────────────────────────────────────
export type GeneratedSlotMeta = {
  slotIndex: number
  slotKey: string
  promptVersion: string
  productId: string | number | null
  sourceImageId: string | number | null
  mediaId?: string | number | null
}

export function buildSlotMeta(params: {
  slotIndex: number
  productId: string | number | null
  sourceImageId: string | number | null
  mediaId?: string | number | null
}): GeneratedSlotMeta {
  const slot = getSlotByIndex(params.slotIndex)
  return {
    slotIndex: params.slotIndex,
    slotKey: slot ? slot.key : `unknown_${params.slotIndex}`,
    promptVersion: SLOT_PROMPT_VERSION,
    productId: params.productId,
    sourceImageId: params.sourceImageId,
    mediaId: params.mediaId ?? null,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Contract validation — lightweight, deterministic. Used by the test suite and
// safe to call at runtime. Returns { ok, errors }.
//
// Enforces:
//   • exactly 5 slots
//   • valid, unique slot keys only
//   • deterministic canonical order (index i === key i)
//   • a centering/framing rule present in every slot's prompt template
//   • a prompt version is set
// ─────────────────────────────────────────────────────────────────────────────
export function validateSlotContract(): { ok: boolean; errors: string[] } {
  const errors: string[] = []

  // Exactly 5 slots
  if (GENERATED_SLOTS.length !== 5) {
    errors.push(`expected exactly 5 slots, got ${GENERATED_SLOTS.length}`)
  }
  if (GENERATED_SLOT_KEYS.length !== 5) {
    errors.push(`expected exactly 5 slot keys, got ${GENERATED_SLOT_KEYS.length}`)
  }

  // Deterministic canonical order + valid, unique keys
  const seen = new Set<string>()
  GENERATED_SLOTS.forEach((slot, i) => {
    if (slot.index !== i) {
      errors.push(`slot at position ${i} has non-deterministic index ${slot.index}`)
    }
    if (slot.key !== GENERATED_SLOT_KEYS[i]) {
      errors.push(`slot order drift at ${i}: key "${slot.key}" !== canonical "${GENERATED_SLOT_KEYS[i]}"`)
    }
    if (!isValidSlotKey(slot.key)) {
      errors.push(`invalid slot key "${slot.key}" at ${i}`)
    }
    if (seen.has(slot.key)) {
      errors.push(`duplicate slot key "${slot.key}"`)
    }
    seen.add(slot.key)
    // D-408: every slot must carry a valid centering coverage (0..1].
    if (!(slot.frameCoverage > 0 && slot.frameCoverage <= 1)) {
      errors.push(`slot "${slot.key}" has invalid frameCoverage ${slot.frameCoverage}`)
    }
    // D-416: layout must be 'single' or 'pair'.
    if (slot.layout !== 'single' && slot.layout !== 'pair') {
      errors.push(`slot "${slot.key}" has invalid layout ${slot.layout}`)
    }
  })

  // D-416: exactly the two intended slots are pairs (hero_3q + top).
  const pairKeys = GENERATED_SLOTS.filter((s) => s.layout === 'pair').map((s) => s.key)
  if (pairKeys.length !== 2 || !pairKeys.includes('hero_3q') || !pairKeys.includes('top')) {
    errors.push(`expected exactly [hero_3q, top] as pair slots, got [${pairKeys.join(', ')}]`)
  }

  // GENERATED_SCENES must mirror the slots 1:1 in order
  if (GENERATED_SCENES.length !== GENERATED_SLOTS.length) {
    errors.push(`GENERATED_SCENES length ${GENERATED_SCENES.length} !== slots length ${GENERATED_SLOTS.length}`)
  }
  GENERATED_SCENES.forEach((scene, i) => {
    if (scene.name !== GENERATED_SLOT_KEYS[i]) {
      errors.push(`scene order drift at ${i}: "${scene.name}" !== "${GENERATED_SLOT_KEYS[i]}"`)
    }
    // Centering/framing rule must be present in EVERY slot's prompt template.
    if (!/FRAMING & CENTERING DISCIPLINE/.test(scene.sceneInstructions)) {
      errors.push(`slot "${scene.name}" prompt is missing the centering/framing rule`)
    }
    if (!/centered/i.test(scene.sceneInstructions)) {
      errors.push(`slot "${scene.name}" prompt does not mention centering`)
    }
  })

  // Prompt version set
  if (!SLOT_PROMPT_VERSION || !SLOT_PROMPT_VERSION.trim()) {
    errors.push('SLOT_PROMPT_VERSION is empty')
  }

  return { ok: errors.length === 0, errors }
}

/** Throwing variant for tests / boot-time assertions. */
export function assertSlotContract(): void {
  const { ok, errors } = validateSlotContract()
  if (!ok) {
    throw new Error(`imageSlotContract invalid:\n- ${errors.join('\n- ')}`)
  }
}
