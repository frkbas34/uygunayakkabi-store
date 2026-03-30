/**
 * Luma prompt templates — Step 26 / Phase 1 (studio_angles)
 *
 * PRODUCT IDENTITY PRESERVATION RULES (enforced in every prompt):
 *   - Same exact shoe as the reference image
 *   - Same color family — no drift
 *   - Same silhouette, sole shape, toe geometry
 *   - Same lace structure and count
 *   - Same material appearance
 *   - Same logo / branding zones (preserve, do not invent or alter)
 *   - No people, no feet, no legs (Phase 1 — studio only)
 *   - No added props or accessories
 *
 * Visual identity is anchored by `image_ref` at high weight (0.85–0.90).
 * The prompt describes SCENE GEOMETRY only — not shoe design.
 *
 * Prompt structure:
 *   [scene type] + [camera angle] + [background/lighting] + [identity lock] + [hard prohibitions]
 */

import type { LumaAspectRatio, LumaModel } from './lumaApi'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type ProductIdentityContext = {
  /** Primary color extracted from product record or identity lock */
  mainColor: string
  /** Material descriptor — leather, suede, mesh, canvas, etc. */
  material?: string
  /** Brand name — used in branding-zone warnings */
  brand?: string
  /** Product category — shoe / sneaker / boot / sandal */
  category?: string
}

export type StudioAngleSlot = {
  /** Machine name — stored in providerResults + Media altText */
  name: string
  /** Turkish label — shown in Telegram preview captions */
  label: string
  aspectRatio: LumaAspectRatio
  /** Weight applied to image_ref for this slot (higher = more identity fidelity) */
  imageRefWeight: number
  /** Build the final prompt from product identity context */
  buildPrompt: (ctx: ProductIdentityContext) => string
}

// ─────────────────────────────────────────────────────────────────────────────
// Hard-coded identity lock suffix injected into every slot prompt
// ─────────────────────────────────────────────────────────────────────────────

function identityLockSuffix(ctx: ProductIdentityContext): string {
  const colorNote  = `The shoe is ${ctx.mainColor} — do NOT change the color.`
  const matNote    = ctx.material ? `Material is ${ctx.material} — preserve surface texture and finish.` : ''
  const brandNote  = ctx.brand
    ? `Brand identity zones (logos, stripes, text) must be preserved faithfully — do NOT invent or alter branding.`
    : ''
  const prohibitions =
    `STRICTLY FORBIDDEN: changing shoe design, altering sole geometry, inventing new colors, ` +
    `adding feet or legs, adding accessories, adding extra objects, blurry or low-resolution output, ` +
    `watermarks, text overlays.`

  return [colorNote, matNote, brandNote, prohibitions].filter(Boolean).join(' ')
}

// ─────────────────────────────────────────────────────────────────────────────
// Studio angle slot definitions
// ─────────────────────────────────────────────────────────────────────────────

export const STUDIO_ANGLE_SLOTS: readonly StudioAngleSlot[] = [
  {
    name: 'studio_front',
    label: 'Slot 1 — Ön Stüdyo',
    aspectRatio: '1:1',
    imageRefWeight: 0.88,
    buildPrompt: (ctx) =>
      `Professional e-commerce studio product photograph. ` +
      `The exact same shoe from the reference image, placed upright on a flat surface. ` +
      `Camera positioned directly in front of the shoe at mid-height, perpendicular to the toe cap. ` +
      `The shoe faces the camera dead-on — both sides symmetrically visible. ` +
      `Pure white seamless background (#FFFFFF). ` +
      `Soft overhead key light, bilateral fill panels, subtle ground shadow only. ` +
      `Full shoe visible — collar top and sole bottom both in frame. ` +
      `No reflections. No surface texture. No props. No people. ` +
      identityLockSuffix(ctx),
  },

  {
    name: 'studio_side',
    label: 'Slot 2 — Yan Profil',
    aspectRatio: '1:1',
    imageRefWeight: 0.88,
    buildPrompt: (ctx) =>
      `Professional e-commerce studio product photograph. ` +
      `The exact same shoe from the reference image, photographed in a pure lateral side profile. ` +
      `Camera positioned exactly 90 degrees to the side — looking directly at the medial face. ` +
      `Shoe pointing left, heel to the right. Full sole silhouette visible from toe tip to heel counter. ` +
      `Arch curve and heel height clearly readable in profile. ` +
      `Soft neutral grey seamless background. Subtle gradient. ` +
      `Key light from front-left 45 degrees, fill from opposite. ` +
      `No reflections. No props. No people. ` +
      identityLockSuffix(ctx),
  },

  {
    name: 'studio_quarter',
    label: 'Slot 3 — Üç Çeyrek Açı',
    aspectRatio: '1:1',
    imageRefWeight: 0.85,
    buildPrompt: (ctx) =>
      `Professional e-commerce studio product photograph. ` +
      `The exact same shoe from the reference image, photographed at a 3/4 front-left angle. ` +
      `Camera positioned at 45 degrees to the left of the shoe at mid-height. ` +
      `Both the toe cap face AND the medial side face are visible simultaneously. ` +
      `The lacing system, tongue, and side silhouette all visible. ` +
      `Pure white seamless background. ` +
      `Soft diffused studio lighting — no harsh shadows, no specular hotspots. ` +
      `Catalog quality. High detail on upper material and branding zones. ` +
      `No props. No people. ` +
      identityLockSuffix(ctx),
  },
] as const

// ─────────────────────────────────────────────────────────────────────────────
// Model config
// ─────────────────────────────────────────────────────────────────────────────

/** Default model — fast and affordable, used for first-pass generation */
export const LUMA_DEFAULT_MODEL: LumaModel =
  (process.env.LUMA_MODEL_DEFAULT as LumaModel | undefined) ?? 'photon-flash-1'

/** HQ model — higher quality, used only when operator explicitly requests rerun */
export const LUMA_HQ_MODEL: LumaModel =
  (process.env.LUMA_MODEL_HQ as LumaModel | undefined) ?? 'photon-1'

/** Maximum number of source reference images to send to Luma (API max: 4) */
export const LUMA_MAX_SOURCE_IMAGES = 4

/** How long to wait for Luma generations to complete, in milliseconds */
export const LUMA_POLL_TIMEOUT_MS = 120_000  // 2 minutes

/**
 * Build a ProductIdentityContext from flat product fields.
 * Falls back gracefully when fields are absent (automation drafts may be sparse).
 */
export function buildIdentityContext(product: Record<string, unknown>): ProductIdentityContext {
  return {
    mainColor: (product.color as string | undefined) || 'as shown in reference',
    material:  (product.material as string | undefined) || undefined,
    brand:     (product.brand as string | undefined) || undefined,
    category:  (product.category as string | undefined) || 'shoe',
  }
}
