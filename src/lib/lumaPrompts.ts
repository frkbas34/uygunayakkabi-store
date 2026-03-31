/**
 * Luma prompt templates — Step 26 / Phase 1 (studio_angles)
 *
 * PRODUCT IDENTITY PRESERVATION RULES (enforced in every prompt):
 *   - See productPreservation.ts for the canonical shared prohibition list
 *   - No people, no feet, no legs (Phase 1 — studio only)
 *
 * ENVIRONMENT LOCK (enforced in every prompt):
 *   - Seamless studio backdrop ONLY — no real-world surfaces
 *   - Explicitly forbidden: wood, table, floor, marble, concrete, plants,
 *     room interior, furniture, outdoor, any environmental context
 *   - buildStudioEnvironmentLock() must be the FIRST block in every prompt
 *
 * Visual identity is anchored by `image_ref` at high weight (0.88–0.90).
 * The prompt describes SCENE GEOMETRY only — not shoe design.
 *
 * Prompt structure (ORDER IS IMPORTANT for Luma):
 *   1. Environment lock (what the background/context MUST be + what is FORBIDDEN)
 *   2. Scene geometry (camera angle, framing, what must be visible)
 *   3. Lighting spec
 *   4. Product identity lock (color, material, brand, prohibited changes)
 */

import type { LumaAspectRatio, LumaModel } from './lumaApi'
import {
  type ProductIdentityContext,
  buildPreservationBlock,
  buildIdentityContextFromProduct,
} from './productPreservation'

// Re-export for callers that previously imported from here
export type { ProductIdentityContext }

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
// Studio environment lock — MUST lead every Luma Studio prompt
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates a hard environment lock that prevents Luma from placing the product
 * in any real-world context, surface, or editorial environment.
 *
 * This block must be the FIRST text in every Stage 1 Luma prompt.
 * Luma processes the beginning of a prompt with highest attention weight.
 *
 * Forbidden surfaces are listed explicitly — generic instructions like
 * "white background" are not sufficient; named-surface prohibitions are required.
 */
function buildStudioEnvironmentLock(backgroundSpec: string): string {
  return (
    `STRICT CATALOG STUDIO PRODUCT PHOTOGRAPHY — ISOLATED PRODUCT ONLY. ` +
    `Background: ${backgroundSpec}. ` +
    `ABSOLUTELY NO environment, context, surface, or scene. ` +
    `FORBIDDEN BACKGROUNDS AND SURFACES: wood table, wooden desk, marble surface, ` +
    `concrete floor, carpet, tile floor, grass, sand, stone, any table surface, ` +
    `any floor surface, any shelf, any furniture, indoor room interior, outdoor scene, ` +
    `window light environment, editorial set, lifestyle context, plants, flowers, ` +
    `props, hands, feet, legs, people, clothing, fabric drape, any object besides the shoe. ` +
    `The background must contain ZERO environmental elements. ` +
    `This is a pure commercial product catalog photograph — not a lifestyle, editorial, or environmental image.`
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Studio angle slot definitions
// ─────────────────────────────────────────────────────────────────────────────

export const STUDIO_ANGLE_SLOTS: readonly StudioAngleSlot[] = [
  {
    name: 'studio_front',
    label: 'Slot 1 — Ön Stüdyo',
    aspectRatio: '1:1',
    imageRefWeight: 0.90,
    buildPrompt: (ctx) =>
      buildStudioEnvironmentLock('pure white seamless backdrop #FFFFFF — nothing else') +
      ` ` +
      `The exact same shoe from the reference image, placed upright on its sole, perfectly centered. ` +
      `CAMERA: Directly in front of the shoe, lens perpendicular to the toe cap, at mid-height (lacing zone). ` +
      `The shoe faces the camera dead-on — left and right sides equally visible (perfectly symmetric view). ` +
      `FRAME: Full shoe in frame — top of collar and bottom of sole both visible. Shoe fills 70–75% of frame height. ` +
      `LIGHTING: Soft overhead key light, bilateral fill panels, very subtle ground shadow only. No reflections. No specular glare. No gradient sky. ` +
      `COMPOSITION: Shoe only. Zero props. Zero environmental elements. Zero surface texture visible. ` +
      buildPreservationBlock(ctx),
  },

  {
    name: 'studio_side',
    label: 'Slot 2 — Yan Profil',
    aspectRatio: '1:1',
    imageRefWeight: 0.90,
    buildPrompt: (ctx) =>
      buildStudioEnvironmentLock('soft neutral grey seamless backdrop — nothing else, no gradients, no surfaces') +
      ` ` +
      `The exact same shoe from the reference image, photographed in a pure lateral side profile. ` +
      `CAMERA: Exactly 90 degrees to the side — looking directly at the medial (inner) face of the shoe. ` +
      `ORIENTATION: Shoe pointing LEFT, heel to the RIGHT. ` +
      `FRAME: Full shoe from toe tip to heel counter. Entire sole silhouette visible from one end to the other. Arch curve and heel height clearly readable. Shoe fills 75% of frame width. ` +
      `LIGHTING: Key light from front-left 45 degrees, fill from opposite side. Subtle sole-edge highlight. No reflections. No surface texture. ` +
      `COMPOSITION: Shoe only. Zero props. Zero environmental elements. ` +
      buildPreservationBlock(ctx),
  },

  {
    name: 'studio_quarter',
    label: 'Slot 3 — Üç Çeyrek Açı',
    aspectRatio: '1:1',
    imageRefWeight: 0.88,
    buildPrompt: (ctx) =>
      buildStudioEnvironmentLock('pure white seamless backdrop #FFFFFF — nothing else, no surface textures, no gradients') +
      ` ` +
      `The exact same shoe from the reference image, photographed at a 3/4 front-left angle. ` +
      `CAMERA: 45 degrees to the left of the shoe at mid-height — a classic three-quarter front view. ` +
      `VISIBILITY: Both the toe cap face AND the medial side face visible simultaneously. Lacing system, tongue, and side silhouette all in frame. ` +
      `FRAME: Full shoe — collar top and sole bottom both visible. Shoe fills 70% of frame. ` +
      `LIGHTING: Soft diffused studio lighting — no harsh shadows, no specular hotspots, no glare. Catalog quality. High detail on upper material and branding zones. ` +
      `COMPOSITION: Shoe only. Zero props. Zero environmental elements. Zero surface texture visible. ` +
      buildPreservationBlock(ctx),
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
 * Delegates to shared buildIdentityContextFromProduct in productPreservation.ts.
 */
export function buildIdentityContext(product: Record<string, unknown>): ProductIdentityContext {
  return buildIdentityContextFromProduct(product)
}
