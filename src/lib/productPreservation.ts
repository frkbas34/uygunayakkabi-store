/**
 * productPreservation — Shared product identity preservation rules
 *
 * Central authority for what must be preserved in AI-generated product images.
 * Consumed by ALL generation engines: Luma, ChatGPT (OpenAI), Gemini Pro.
 *
 * This module owns:
 *   - ProductIdentityContext type (shared across all engines)
 *   - PRODUCT_PRESERVATION_PROHIBITIONS (canonical prohibition list)
 *   - buildPreservationBlock() (generates engine-agnostic prohibition text)
 *
 * Engines may add engine-specific instructions on top of this base layer,
 * but must NOT redefine the core prohibitions independently.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Shared product identity context
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Minimal product description used to anchor identity preservation in prompts.
 * Populated from product DB fields; falls back gracefully when fields are sparse.
 */
export type ProductIdentityContext = {
  /** Primary color of the product as extracted from DB or identity analysis */
  mainColor: string
  /** Upper material — leather, suede, mesh, canvas, etc. */
  material?: string
  /** Brand name — used to anchor branding-zone warnings */
  brand?: string
  /** Product category — shoe / sneaker / boot / sandal */
  category?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Canonical prohibition list
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Master list of what is NEVER allowed in generated product images.
 * All engines use this list. Do not define engine-specific prohibitions
 * that contradict or weaken these rules.
 */
export const PRODUCT_PRESERVATION_PROHIBITIONS = [
  'changing the shoe design, silhouette, or product shape',
  'altering sole geometry, sole thickness, or sole profile',
  'altering toe shape or toe box width',
  'changing the lace structure, lace count, or closure type',
  'inventing, altering, or removing logos, stripes, or brand marks',
  'changing material finish, surface grain, or texture',
  'shifting the color family (e.g. black→brown, navy→grey)',
  'adding feet, legs, or people (except lifestyle shots)',
  'adding accessories, extra objects, or props not in the reference',
  'replacing the product with a visually similar but different shoe',
  'adding watermarks, text overlays, or low-resolution noise',
] as const

// ─────────────────────────────────────────────────────────────────────────────
// Prompt block builder
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a shared preservation instruction block suitable for injection
 * into any engine's generation prompt.
 *
 * Covers: color lock, material lock, brand zone lock, hard prohibitions.
 * Engines (Luma, ChatGPT, Gemini Pro) inject this before scene-specific text.
 */
export function buildPreservationBlock(ctx: ProductIdentityContext): string {
  const colorNote =
    `The shoe is ${ctx.mainColor} — do NOT change the color.`

  const matNote = ctx.material
    ? `Material is ${ctx.material} — preserve surface texture and finish.`
    : ''

  const brandNote = ctx.brand
    ? `Brand identity zones (logos, stripes, text) must be preserved faithfully — do NOT invent or alter branding.`
    : ''

  const prohibitions =
    `STRICTLY FORBIDDEN: ` + PRODUCT_PRESERVATION_PROHIBITIONS.join('; ') + `.`

  return [colorNote, matNote, brandNote, prohibitions].filter(Boolean).join(' ')
}

/**
 * Build a ProductIdentityContext from flat product DB fields.
 * Falls back gracefully when fields are absent (automation drafts may be sparse).
 *
 * Shared utility — call from any task that needs to build identity context
 * from a Payload product document.
 */
export function buildIdentityContextFromProduct(
  product: Record<string, unknown>,
): ProductIdentityContext {
  return {
    mainColor: (product.color as string | undefined) || 'as shown in reference',
    material:  (product.material as string | undefined) || undefined,
    brand:     (product.brand as string | undefined) || undefined,
    category:  (product.category as string | undefined) || 'shoe',
  }
}
