/**
 * imageProviders — Step 25 v9
 *
 * STRICT OPENAI-ONLY product-preserving image generation.
 *
 * ALL modes (#gorsel, #hizli, #dengeli, #premium) route to the SAME pipeline:
 *   Step A: validateProductImage()   — Gemini Vision: reject non-shoe inputs
 *   Step B: extractIdentityLock()    — Gemini Vision: structured 10-field identity
 *   Step C: generateByEditing()      — OpenAI gpt-image-1 /v1/images/edits × 5 slots
 *   Step D: checkColorMatch()        — Gemini Vision: per-slot color fidelity check
 *
 * Gemini is used ONLY for analysis (validation, identity extraction, color checking).
 * Gemini NEVER generates final product images.
 * If editing fails → hard fail. No text-to-image fallback. No Gemini generation.
 * If color drifts (black→brown) → slot marked REJECTED, retry once with reinforced prompt.
 */

import { PRODUCT_PRESERVATION_PROHIBITIONS } from './productPreservation'
import { LOCK_REMINDER_BLOCK } from './imageLockReminder'
// D-407: central 5-slot contract — single source of truth for slot types, order,
// and the centering/framing discipline. EDITING_SCENES is now derived from it.
import { GENERATED_SCENES, getSlotByKey } from './imageSlotContract'

// ─────────────────────────────────────────────────────────────────────────────
// Shared canonical prohibitions — injected into EVERY generation prompt
// ─────────────────────────────────────────────────────────────────────────────
// This ensures the same master prohibition list from productPreservation.ts
// is used by ALL engines (OpenAI, Gemini Pro) — single source of truth.

const CANONICAL_PROHIBITIONS_BLOCK =
  `\n═══ ABSOLUTE PROHIBITIONS ═══\n` +
  `The following changes are STRICTLY FORBIDDEN in any generated image:\n` +
  PRODUCT_PRESERVATION_PROHIBITIONS.map((p) => `• ${p}`).join('\n') +
  `\nAny image violating these rules will be REJECTED.\n` +
  `═══════════════════════════\n`

// ─────────────────────────────────────────────────────────────────────────────
// Anti-frame enforcer — placed LAST in prompt for maximum recency attention
// ─────────────────────────────────────────────────────────────────────────────
const ANTI_FRAME_FINAL_BLOCK =
  `\n\n═══ FINAL OUTPUT RULE — NO FRAMES (MANDATORY) ═══\n` +
  `Before you output, verify: does the generated image contain ANY of these?\n` +
  `• A visible border, outline, or edge that is NOT the canvas edge\n` +
  `• A rectangular "card", "tile", or "panel" effect around the product\n` +
  `• A shadow-box, drop-shadow rectangle, or rounded-corner frame\n` +
  `• A white/gray margin between the photo content and the canvas edge\n` +
  `• An image-inside-an-image or photo-on-a-background appearance\n` +
  `• Any decorative edge, vignette border, or poster presentation\n` +
  `If YES to ANY of the above → your output is WRONG. Regenerate WITHOUT any frame.\n` +
  `The background color/scene MUST extend to ALL FOUR edges of the output canvas.\n` +
  `There must be ZERO pixels of border/margin between the photo content and the canvas edge.\n` +
  `This is a raw camera photograph, NOT a product card, NOT a mockup, NOT a framed print.\n` +
  `═══════════════════════════════════════════════════\n`

// ─────────────────────────────────────────────────────────────────────────────
// D-418: PAIR MODE — for the 2 'pair' slots (hero_3q + top) the model renders a
// natural matched pair (left + right foot). Placed LAST (max recency) so it
// overrides the earlier "single shoe / no extra shoe / same physical object"
// rules for THIS image only. Text/logos stay readable on both (unlike the old
// deterministic mirror), and the two shoes are the same identical model.
// ─────────────────────────────────────────────────────────────────────────────
const PAIR_MODE_FINAL_BLOCK =
  `\n\n═══ PAIR MODE — THIS IMAGE SHOWS BOTH SHOES (OVERRIDE) ═══\n` +
  `This specific image is a PAIR shot. Show EXACTLY TWO shoes: the LEFT foot and the RIGHT foot of the SAME shoe model, side by side.\n` +
  `This OVERRIDES any "single shoe", "one shoe", "no extra shoe", or "same single physical object" instruction above — for THIS image a matched pair (two shoes) is REQUIRED, not one.\n` +
  `The two shoes MUST be the identical matched pair of the exact same product: same colour, same material, same stitching, same logo, same stripes, same sole, same every detail. They are a left/right pair, NOT two different shoes and NOT two of the same foot.\n` +
  `COLOUR LOCK (CRITICAL): BOTH shoes MUST be the EXACT SAME colour and colourway as the reference — the same tone on both. Do NOT make one shoe a different colour, shade, or material from the other (e.g. one tan and one grey is WRONG). Both are the same colour of the same product.\n` +
  `All text and logos (brand name, model name, stripes, emblems) must read CORRECTLY and un-mirrored on BOTH shoes.\n` +
  `Arrange them close together as a natural, premium e-commerce catalog pair on the same seamless studio background. Exactly two shoes — not one, not three.\n` +
  `═══════════════════════════════════════════════════\n`

// ─────────────────────────────────────────────────────────────────────────────
// Task framing — tells the model WHAT IT IS DOING before any details
// ─────────────────────────────────────────────────────────────────────────────
// This block is injected BEFORE the identity lock in every generation prompt.
// It frames the task as "re-photograph the same physical product" rather than
// "create/design a new product image", which dramatically reduces hallucination.

const TASK_FRAMING_BLOCK =
  `═══ TASK: RE-PHOTOGRAPH AN EXISTING PRODUCT ═══\n` +
  `You are a commercial product photographer with a physical shoe in front of you.\n` +
  `The reference image(s) show the EXACT PHYSICAL SHOE you are photographing.\n` +
  `Your job: produce a NEW CLEAN PRODUCT PHOTO of THIS SAME SHOE from a different angle/setting.\n` +
  `\n` +
  `WHAT MUST STAY IDENTICAL:\n` +
  `• The shoe itself — silhouette, sole, toe shape, laces, stitching, logos, material, color.\n` +
  `• Every structural detail that makes this shoe this specific shoe.\n` +
  `• NOT a similar shoe. NOT a redesigned shoe. THE SAME PHYSICAL OBJECT.\n` +
  `\n` +
  `SET IDENTITY LOCK (ALL 5 IMAGES — MANDATORY):\n` +
  `• Every image in this set is the SAME physical shoe — no redesign, no reinterpretation between slots.\n` +
  `• Do NOT add any extra part, panel, strap, buckle, lace, eyelet, logo, or ornament that is not on the reference.\n` +
  `• Do NOT remove or hide any part that IS on the reference.\n` +
  `• Do NOT alter the stitching, accessories, silhouette, sole, heel, or toe shape between slots.\n` +
  `• Do NOT invent logos or branding. Keep the EXACT same material and color in every slot.\n` +
  `\n` +
  `WHAT MAY CHANGE:\n` +
  `• ONLY the camera angle, viewpoint, and crop of the same shoe on the same studio set.\n` +
  `• The background stays the SAME locked soft warm ivory studio backdrop in EVERY slot — it does NOT change to a floor, tabletop, outdoor, or lifestyle scene.\n` +
  `• Think: same shoe, same studio, camera moved to a new angle.\n` +
  `\n` +
  `NEVER FABRICATE UNSEEN REGIONS (ANTI-HALLUCINATION — MANDATORY):\n` +
  `• Render ONLY what is actually visible in the reference image(s). Do NOT invent any region the reference does not show.\n` +
  `• If a region (e.g. the outsole/bottom tread, the exact rear/heel detailing, or the inner side) is NOT visible in the reference, do NOT fabricate it — keep it plain, minimal, and consistent with the visible material and color, and prefer an angle that does not expose it.\n` +
  `• Do NOT add tread patterns, logos, stamps, stitching, panels, buckles, straps, or ornaments that are not clearly present in the reference.\n` +
  `\n` +
  `OUTPUT FORMAT — CRITICAL:\n` +
  `• Full-bleed photograph — the image IS the product photo, nothing else.\n` +
  `• NO frames, NO borders, NO margins, NO outer shadow boxing.\n` +
  `• NOT a photo inside a white canvas. NOT a mockup. NOT a card. NOT a poster.\n` +
  `• The output must look like a direct camera shot, NOT like an image placed inside another image.\n` +
  `• NO watermarks, NO logos, NO branding overlays, NO text of any kind in the image.\n` +
  `\n` +
  `ANTI-FRAME RULE (ZERO TOLERANCE):\n` +
  `• Do NOT generate an image-inside-an-image. Do NOT create a framed-photo look.\n` +
  `• Do NOT create visible outer borders or a poster/card/mockup presentation.\n` +
  `• Do NOT place the photo inside a rectangular panel, card, or bordered area.\n` +
  `• Do NOT add decorative edges, shadow boxing, or vignette framing.\n` +
  `• Do NOT render the image as if it were printed on paper and photographed.\n` +
  `• The photo content must extend all the way to every edge of the output image.\n` +
  `• If your output has visible boundaries between "the photo" and "the canvas", it is WRONG.\n` +
  `\n` +
  `BACKGROUND CONSISTENCY (ALL SLOTS):\n` +
  `• All images in this batch share ONE studio backdrop color.\n` +
  `• Each slot specifies a BACKGROUND line — use that EXACT color.\n` +
  `• Slot 1 sets the background for the batch. All other slots MUST match.\n` +
  `• No slot may drift to a different color, shade, or warmth.\n` +
  `\n` +
  `QUALITY STANDARD:\n` +
  `• Premium e-commerce photography — think Zara / Nike / luxury catalog quality.\n` +
  `• Ultra clean, high clarity, high sharpness, no noise, no clutter.\n` +
  `• Soft studio lighting, natural soft shadow under the shoe.\n` +
  `• No harsh reflections, no dramatic lighting — realistic commercial look.\n` +
  `═══════════════════════════\n\n`

// ─────────────────────────────────────────────────
// Multi-angle reference framing — injected ONLY when the operator sends 2-3 real
// photos of the SAME shoe from different angles. Tells the model the inputs are ONE
// physical product seen from multiple angles, so it copies the real shoe exactly
// (true size/shape of every detail) and never invents, enlarges, or restyles anything.
// This is the core fidelity guarantee: generated images must equal the product the
// customer will actually receive.
const MULTI_REFERENCE_FRAMING_BLOCK =
  `\n\n═══ MULTIPLE REFERENCE ANGLES — SAME PHYSICAL SHOE (GROUND TRUTH) ═══\n` +
  `You have been given SEVERAL reference photographs of the SAME single physical shoe, taken from DIFFERENT angles.\n` +
  `They are ONE product — not different shoes, not variants. Study ALL of them together to understand the true shape, material, color, sole, stitching, and every detail.\n` +
  `These angles exist so you can copy the REAL product EXACTLY and NEVER guess:\n` +
  `• Reproduce ONLY details that actually appear across these reference photos. If a part is not shown in any of them, keep it plain and consistent — do NOT invent it.\n` +
  `• Keep every detail at its TRUE size and form as seen in the references — do NOT enlarge, shrink, restyle, or relocate anything.\n` +
  `• Hardware, logos, emblems, buckles, charms and tassels appear EXACTLY as in the references — same kind, same size, same place. If a metal emblem looks SMALL and flat in the references, keep it SMALL and flat — never turn it into a large buckle, horsebit, bridge, ring, or chain.\n` +
  `• Do NOT add, remove, or alter any part relative to what these photos show. The generated shoe MUST be 100% the same product the customer will receive.\n` +
  `═══════════════════════════\n`

// D-303: Studio standard — uniform background, scale, camera & negatives.
// Appended to every slot prompt so all product images share one look.
// ─────────────────────────────────────────────────
// D-355C: single locked background standard (soft warm ivory) for the whole
// 5-image studio pack — explicit anti-drift + fidelity wording, appended to
// EVERY slot so all images read as one coherent e-commerce set.
const STUDIO_STANDARD_BLOCK =
  `\n\n═══ STUDIO STANDARD (MANDATORY — ALL SLOTS) ═══\n` +
  `BACKGROUND: soft warm ivory seamless studio background (matte ivory/beige, hex #F4EFE6) — no gradient, no colored tint, no texture, no hard shadow. Use this EXACT same ivory tone in EVERY slot.\n` +
  `BACKGROUND CONSISTENCY: all images in this set MUST share one identical ivory tone — no grey drift, no yellow drift, no pink drift, no white-out. The whole batch must look like ONE coherent e-commerce studio set photographed in the same session.\n` +
  `LIGHTING: consistent soft studio lighting with one gentle soft shadow under the shoe, the same look in every slot.\n` +
  `SCALE: the shoe occupies approximately 74–80% of the canvas width, centered horizontally, full shoe visible, no crop.\n` +
  `BASELINE: the outsole rests on a consistent horizontal baseline, aligned the same way across all products.\n` +
  `CAMERA: clean side/profile product photography, consistent lens, no dramatic perspective distortion.\n` +
  `FIDELITY (same physical shoe): keep the EXACT form, material, color, stitching, sole, heel and toe of the reference — do NOT invent logos, and do NOT add any fake damage, tears, cracks, peeling, scuffs, stains, deformation, wrong stitching, or distorted sole/heel/toe.\n` +
  `NEGATIVE (must NOT appear): no watermark, no logo hallucination, no text, no extra shoe, no deformed sole, no warped toe, no melted leather, no inconsistent background.\n` +
  `═══════════════════════════\n`

// D-355M: shared MATERIAL identity lock — appended to EVERY generated slot so the
// surface / material / finish / colour cannot drift between slots.
const MATERIAL_IDENTITY_LOCK_BLOCK =
  `\n\n═══ MATERIAL IDENTITY LOCK (ALL SLOTS — MANDATORY) ═══\n` +
  `Every image MUST show the SAME material identity as the original reference photo:\n` +
  `• EXACT same material TYPE as the reference — do NOT reinterpret it.\n` +
  `• SAME colour tone AND undertone — keep tan/brown (and every colour) exactly; no warmer, cooler, lighter, or darker drift between slots.\n` +
  `• SAME surface finish — suede / nubuck / smooth leather / grained leather / matte / glossy must NOT change. Matte stays matte; suede stays suede.\n` +
  `• SAME stitching colour and density.\n` +
  `• SAME sole colour and thickness.\n` +
  `• Tassel, lace, buckle, strap, ornament, or hardware appear ONLY if clearly visible in the reference — same kind, same place.\n` +
  `MATERIAL SWITCHING IS FORBIDDEN:\n` +
  `• Do NOT turn suede/nubuck into smooth or shiny leather.\n` +
  `• Do NOT turn a matte material into a shiny / reflective material.\n` +
  `• Do NOT add metallic accessories, reflective hardware, or glossy highlights.\n` +
  `• Do NOT invent any metal, logo, brand text, plate, eyelet, ring, chain, shine, texture, panel, seam, or accessory that is not in the reference.\n` +
  `═══════════════════════════\n`

// D-355N: product VISUAL FACT LOCK — a HARD override against the model's most common
// failure: inventing metal hardware (and brand wordmarks) on shoes that have none.
// Applied to EVERY generated slot. Operators can ALSO inject product-specific facts
// (see buildVisualFactLock) which override the model's visual guesses.
const VISUAL_FACT_LOCK_BLOCK =
  `\n\n═══ VISUAL FACT LOCK (HARD OVERRIDE — ALL SLOTS) ═══\n` +
  `These facts OVERRIDE any assumption the model makes about the product:\n` +
  `• This shoe has NO metal hardware unless something is UNMISTAKABLY shiny solid metal in the reference. Do NOT invent any metal.\n` +
  `• Side, saddle, strap, loop, bridge, band, or saddle-like details are STITCHED FABRIC, THREAD, or LEATHER — NOT metal. When a detail is ambiguous, render it as the fabric/thread/leather it is, NEVER as a metal bit / buckle / bridge / connector.\n` +
  `• FORBIDDEN: inventing any silver or gold metal bit, buckle, chain, ring, plate, connector, clasp, stud, eyelet, or shiny hardware.\n` +
  `• FORBIDDEN: inventing engraved or embossed BRAND-NAME hardware or ANY brand text / logo / wordmark (e.g. do NOT add "BOSS" or any name on metal or anywhere).\n` +
  `• Any subtle marking, monogram, or emboss visible in the reference stays a SUBTLE same-material fabric / embossed / stitched detail — never a metal plate or shiny badge.\n` +
  `• If you are unsure whether something is metal, it is NOT metal — keep it the soft material it is in the reference.\n` +
  `• PRESERVE — do NOT erase, smooth, flatten, blur, or omit — any subtle embossed wordmark, monogram, side detail, perforation, or stitched marking that IS visible in the reference. Reproduce it in the SAME position at the SAME subtlety and SAME material; do not delete it and do not turn it into shiny metal or added brand text.\n` +
  // D-411 (Part B): hardware CONSISTENCY across slots — fixes "metal plate in one
  // slot, plain in another" drift. Live-verified on real #gorsel output.
  `• HARDWARE CONSISTENCY (ALL SLOTS): any metal plate, keeper, buckle, ring, or hardware that is GENUINELY in the reference must appear IDENTICAL in EVERY slot — same size, shape, finish, and position. NEVER add hardware in one slot and omit it in another, and never enlarge, shrink, restyle, or recolor it between slots. If it is not clearly in the reference, do NOT add it in any slot.\n` +
  `═══════════════════════════\n`

/**
 * D-355N: Compose the visual fact lock for a slot prompt. The default hard
 * no-invented-metal lock ALWAYS applies; when the operator supplies product-specific
 * facts they are appended as the HIGHEST-PRIORITY override of the model's guesses.
 */
function buildVisualFactLock(operatorFacts?: string | null): string {
  const facts = (operatorFacts ?? '').trim()
  if (!facts) return VISUAL_FACT_LOCK_BLOCK
  return (
    VISUAL_FACT_LOCK_BLOCK +
    `\n═══ OPERATOR-VERIFIED PRODUCT FACTS (HIGHEST PRIORITY — OVERRIDE MODEL) ═══\n` +
    facts.slice(0, 1000) + `\n` +
    `These operator facts are TRUE for this exact product. Obey them over any visual guess.\n` +
    `═══════════════════════════\n`
  )
}

// D-303: Suede/nubuck-specific material directives. Returns '' for non-suede
// products. Detected from the identity-lock material + visual notes so suede
// shoes stop rendering as glossy patent leather.
function materialDirectives(material?: string | null, notes?: string | null): string {
  const hay = `${material || ''} ${notes || ''}`.toLowerCase()
  const isSuede = ['suede', 'süet', 'suet', 'nubuk', 'nubuck'].some((k) => hay.includes(k))
  if (!isSuede) return ''
  return (
    `\n\n═══ MATERIAL: SUEDE / NUBUCK (MANDATORY) ═══\n` +
    `POSITIVE: realistic matte suede leather, fine short nap texture, subtle directional fibers, soft non-reflective surface, crisp stitching, clean edges, premium loafer material, natural suede grain.\n` +
    `NEGATIVE: no shiny patent leather, no plastic surface, no velvet fabric, no fur, no hairy blobs, no fuzzy deformation, no melted texture, no dirty stains, no over-smoothed leather, no glossy reflections, no distorted tassels, no warped seams.\n` +
    `The surface MUST read as matte suede — NOT glossy patent/rugan leather.\n` +
    `═══════════════════════════\n`
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Premium Background Selection Engine
// ─────────────────────────────────────────────────────────────────────────────
// Maps shoe color → premium contrasting background for studio shots.
// Goal: background supports the product, never competes. Soft, minimal, premium.

// D-233: per-family palette with productId-based deterministic variant.
// Each shoe-color family carries 3-5 premium tones so two products of the
// same shoe color get DIFFERENT backgrounds while every slot of a SINGLE
// product still shares the SAME background (cross-slot consistency from v43
// preserved). Tones stay in the "premium studio, never compete with shoe"
// band — soft, muted, slightly varied luminance/chroma.
type BgVariant = { name: string; hex: string; descriptor?: string }

const BG_PALETTE: Record<string, BgVariant[]> = {
  black: [
    { name: 'warm beige', hex: '#F5F0E8' },
    { name: 'muted sand', hex: '#EAE2D2' },
    { name: 'dusty rose', hex: '#F0E5DD' },
    { name: 'champagne', hex: '#EDE6D5' },
    { name: 'soft taupe', hex: '#E0D8CC' },
  ],
  white: [
    { name: 'light grey', hex: '#E8E8E8', descriptor: 'NOT white — shoe must contrast.' },
    { name: 'cool stone', hex: '#DDE2E5', descriptor: 'NOT white — shoe must contrast.' },
    { name: 'warm taupe', hex: '#E5E0DA', descriptor: 'NOT white — shoe must contrast.' },
    { name: 'pale slate', hex: '#D8DDE2', descriptor: 'NOT white — shoe must contrast.' },
    { name: 'soft bone', hex: '#E8E5DC', descriptor: 'NOT white — shoe must contrast.' },
  ],
  brown: [
    { name: 'warm cream', hex: '#F5F1E6' },
    { name: 'soft sand', hex: '#ECE4D2' },
    { name: 'oat', hex: '#E8DCC4' },
    { name: 'pale vanilla', hex: '#F0E8D5' },
    { name: 'dusty parchment', hex: '#E5DBC8' },
  ],
  tan: [
    { name: 'off-white', hex: '#FAF8F5' },
    { name: 'pale cream', hex: '#F5EFE3' },
    { name: 'soft latte', hex: '#EDE3D0' },
    { name: 'powder beige', hex: '#F0E8D8' },
    { name: 'subtle sage', hex: '#E8E5D6' },
  ],
  grey: [
    { name: 'clean white', hex: '#FFFFFF' },
    { name: 'soft pearl', hex: '#F2F0EC' },
    { name: 'pale champagne', hex: '#F5F0E5' },
    { name: 'light dove', hex: '#ECEAE3' },
    { name: 'warm bone', hex: '#F0EBDF' },
  ],
  navy: [
    { name: 'light grey', hex: '#EDEDED' },
    { name: 'soft stone', hex: '#E2E5E8' },
    { name: 'pale dove', hex: '#DEDFE0' },
    { name: 'warm cool grey', hex: '#E5E2DD' },
    { name: 'ice grey', hex: '#DAE0E2' },
  ],
  red: [
    { name: 'neutral off-white', hex: '#F7F5F3' },
    { name: 'dusty rose', hex: '#F2E8E5' },
    { name: 'warm blush', hex: '#EFE5E0' },
    { name: 'muted clay', hex: '#E8DDD8' },
    { name: 'powder cream', hex: '#F0E5D8' },
  ],
  green: [
    { name: 'warm cream', hex: '#F5F0E8' },
    { name: 'sage tint', hex: '#E8EBE0' },
    { name: 'muted parchment', hex: '#EFEBDD' },
    { name: 'mint mist', hex: '#E0E5D8' },
    { name: 'soft pistachio', hex: '#ECE8D5' },
  ],
  blue: [
    { name: 'warm off-white', hex: '#F5F2ED' },
    { name: 'pale slate', hex: '#D8DDE2' },
    { name: 'soft mist', hex: '#E0E5E8' },
    { name: 'dusty cloud', hex: '#E8EAE8' },
    { name: 'cool pearl', hex: '#ECEEF0' },
  ],
  pink: [
    { name: 'light grey', hex: '#ECECEC' },
    { name: 'dusty mauve', hex: '#EAE0E2' },
    { name: 'soft cream', hex: '#F0EBE3' },
    { name: 'warm grey', hex: '#E5E2DD' },
    { name: 'powder pink', hex: '#F0E5E5' },
  ],
  beige: [
    { name: 'warm grey', hex: '#E0DDD8' },
    { name: 'soft taupe', hex: '#DAD5CC' },
    { name: 'muted sand', hex: '#DDD8C8' },
    { name: 'dusty parchment', hex: '#E5DDC8' },
    { name: 'soft stone', hex: '#D8D5D0' },
  ],
  default: [
    { name: 'neutral light grey', hex: '#EDEDED' },
    { name: 'warm pearl', hex: '#F0EBE3' },
    { name: 'soft sand', hex: '#E8E2D5' },
    { name: 'cool stone', hex: '#E0E3E5' },
    { name: 'soft bone', hex: '#E8E5DC' },
  ],
}

function pickFamily(c: string): keyof typeof BG_PALETTE {
  if (c.includes('black') || c.includes('siyah')) return 'black'
  if (c.includes('white') || c.includes('beyaz') || c.includes('off-white')) return 'white'
  if (c.includes('brown') || c.includes('kahve') || c.includes('espresso')) return 'brown'
  if (c.includes('tan') || c.includes('tobacco') || c.includes('camel') || c.includes('taba')) return 'tan'
  if (c.includes('grey') || c.includes('gray') || c.includes('gri')) return 'grey'
  if (c.includes('navy') || c.includes('lacivert') || (c.includes('blue') && c.includes('dark'))) return 'navy'
  if (c.includes('red') || c.includes('kırmızı') || c.includes('bordo') || c.includes('burgundy')) return 'red'
  if (c.includes('green') || c.includes('yeşil') || c.includes('olive') || c.includes('haki') || c.includes('khaki')) return 'green'
  if (c.includes('blue') || c.includes('mavi')) return 'blue'
  if (c.includes('pink') || c.includes('pembe') || c.includes('rose')) return 'pink'
  if (c.includes('beige') || c.includes('cream') || c.includes('krem')) return 'beige'
  return 'default'
}

/**
 * D-233: Stable per-product variant pick. Same productId always returns the
 * same variant within a family. Different productIds with the same shoe
 * color get different backgrounds. When productId is omitted, returns the
 * first variant — keeps backward compatibility for any callsite that hasn't
 * been threaded yet.
 */
function pickVariant(family: BgVariant[], productId?: string | number): BgVariant {
  if (family.length === 0) return { name: 'neutral light grey', hex: '#EDEDED' }
  if (productId == null) return family[0]
  const numStr = String(productId).replace(/\D/g, '') || '0'
  const n = Number.parseInt(numStr, 10)
  const idx = Math.abs(Number.isFinite(n) ? n : 0) % family.length
  return family[idx]
}

function renderBg(v: BgVariant): string {
  const tail = v.descriptor
    ? `Solid, uniform tone. ${v.descriptor} Use this EXACT color for ALL slots. No gradient.`
    : `Solid, uniform, soft premium studio tone. Use this EXACT color for ALL slots in this batch. No gradient.`
  return `${v.name} (${v.hex}). ${tail}`
}

function getBackgroundForColor(mainColor: string, productId?: string | number): string {
  // D-303: Unified studio background for ALL products (operator rule — every
  // product-card image must share the SAME premium neutral background). This
  // supersedes the per-color/per-product variation (D-233 / v43). The hex is
  // kept in sync with the storefront --product-image-bg CSS variable.
  // Reversible: restore the BG_PALETTE pick (pickFamily/pickVariant) to revert.
  void mainColor; void productId
  return 'matte warm ivory/beige (#F4EFE6). Seamless studio background — no gradient, no colored tint, no texture, no hard shadow. Solid, uniform tone. Use this EXACT color for ALL slots in this batch.'
}

/**
 * Extract hex color from getBackgroundForColor() output and return RGB.
 * e.g. "warm beige (#F5F0E8). Solid..." → { r: 245, g: 240, b: 232 }
 * Falls back to neutral light grey if parsing fails.
 */
function getBackgroundRGB(backgroundStr: string): { r: number; g: number; b: number; alpha: number } {
  const match = backgroundStr.match(/#([0-9A-Fa-f]{6})/)
  if (match) {
    const hex = match[1]
    return {
      r: parseInt(hex.substring(0, 2), 16),
      g: parseInt(hex.substring(2, 4), 16),
      b: parseInt(hex.substring(4, 6), 16),
      alpha: 1,
    }
  }
  // Fallback: neutral light grey
  return { r: 237, g: 237, b: 237, alpha: 1 }
}

/**
 * D-157: Sample the reference image's corner pixels to derive a padding color
 * that blends invisibly with the image's existing background.
 *
 * Root cause of frame regression:
 *   extractIdentityLock() fails ~60% of calls and triggers buildFallbackLock(),
 *   which returns mainColor='as shown in reference'. That string doesn't match
 *   any palette entry in getBackgroundForColor(), so padding falls through to
 *   the default near-white (#EDEDED). When that near-white ring is extended
 *   around a product photo whose own background is a different shade (e.g.
 *   pure white or a studio gray), the input canvas contains a VISIBLE inner
 *   rectangle — and Gemini preserves that rectangle as a "framed photo"
 *   look in its output, violating the v50 locked no-frame rule.
 *
 * Fix: sample four 16×16 corner patches of the reference image, average them,
 * and use that RGB for both `fit: 'contain'` letterboxing and the 128px
 * `.extend()` ring. This guarantees the padding color matches the image's
 * existing edge pixels, so there is no visible boundary between the inner
 * product photo and the outer padding — Gemini sees ONE continuous canvas.
 *
 * The scene-specific BACKGROUND instruction is unchanged and still tells the
 * model what target color to render in the OUTPUT. The padding color is now
 * purely a visual camouflage for the input.
 */
/**
 * D-161: edge-sampled padding color with non-uniformity guard.
 *
 * Replaces the D-157 implementation, which had TWO bugs:
 *
 *  1. Sharp API misuse: `sharp(buf).extract(rect).stats()` does NOT apply
 *     the extract before computing stats — `.stats()` is a terminal libvips
 *     operation that bypasses prior pipeline steps. So D-157's "four corner
 *     samples" were actually four copies of the full-image mean. This was
 *     verified locally against the SN0151 reference: raw-buffer extraction
 *     of the four 32×32 corners returned (122,123,127), (26,22,21),
 *     (116,111,101), (109,105,98) — wildly different — while
 *     `.extract().stats()` returned (119,103,99) for all four (which is
 *     just the whole-image mean).
 *
 *  2. Assumption failure: even when correctly sampled, real-world product
 *     photos frequently have non-uniform backgrounds (one near-black corner
 *     + three taupe corners was the SN0151 case). Averaging gives a dark
 *     taupe that Gemini preserves as a visible outer frame around its
 *     rendered scene.
 *
 * D-161 rewrite:
 *  - Use `.extract(rect).removeAlpha().raw().toBuffer()` so the extraction
 *    actually happens, then compute the mean from raw pixel bytes.
 *  - Compute Chebyshev spread across the four corner samples. If any
 *    channel spread >40, the reference is non-uniform → fall back to pure
 *    white padding (Gemini treats white as a blank canvas to extend the
 *    scene background over, not as a "frame" to preserve).
 *  - If the reference IS uniform (clean studio shots, Gemini reruns), use
 *    the honest corner average — keeps D-157's benefit for the
 *    D-129 near-white-on-colored-shoe case.
 */
// D-164: RETIRED. Padding is now bgRGB (v50 baseline). This function is
// preserved for reference only — the D-161 Chebyshev/raw-buffer sampling
// logic is documented in DECISIONS.md D-161 and may be useful if we ever
// need edge-sampling for a different purpose (e.g. identity lock fallback
// tone detection). If you re-enable this function as the padding source,
// re-read DECISIONS.md D-164 FIRST — reintroducing it without a padding
// = bgRGB fallback will re-break SN0153-style frames.
//
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function sampleEdgeBackgroundRGB(
  referenceImage: Buffer,
): Promise<{ r: number; g: number; b: number; alpha: number }> {
  const NEUTRAL_WHITE = { r: 255, g: 255, b: 255, alpha: 1 }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const sharp = require('sharp') as typeof import('sharp')
    const meta = await sharp(referenceImage).metadata()
    const w = meta.width ?? 0
    const h = meta.height ?? 0
    if (!w || !h || w < 32 || h < 32) {
      return NEUTRAL_WHITE
    }
    const patch = Math.max(8, Math.min(32, Math.floor(Math.min(w, h) / 20)))
    const rects = [
      { left: 0,         top: 0,         width: patch, height: patch },
      { left: w - patch, top: 0,         width: patch, height: patch },
      { left: 0,         top: h - patch, width: patch, height: patch },
      { left: w - patch, top: h - patch, width: patch, height: patch },
    ]

    const samples: Array<{ r: number; g: number; b: number }> = []
    for (const rect of rects) {
      // D-161: raw buffer path — .stats() does NOT respect .extract()
      const { data, info } = await sharp(referenceImage)
        .extract(rect)
        .removeAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true })
      const n = info.width * info.height
      if (n === 0) {
        samples.push({ r: 255, g: 255, b: 255 })
        continue
      }
      let rSum = 0, gSum = 0, bSum = 0
      for (let i = 0; i < data.length; i += 3) {
        rSum += data[i]
        gSum += data[i + 1]
        bSum += data[i + 2]
      }
      samples.push({ r: rSum / n, g: gSum / n, b: bSum / n })
    }

    // Non-uniformity guard
    const rs = samples.map((s) => s.r)
    const gs = samples.map((s) => s.g)
    const bs = samples.map((s) => s.b)
    const spread = Math.max(
      Math.max(...rs) - Math.min(...rs),
      Math.max(...gs) - Math.min(...gs),
      Math.max(...bs) - Math.min(...bs),
    )
    const UNIFORMITY_THRESHOLD = 40
    const compactSamples = samples.map((s) => ({
      r: Math.round(s.r),
      g: Math.round(s.g),
      b: Math.round(s.b),
    }))
    if (spread > UNIFORMITY_THRESHOLD) {
      console.log(
        `[sampleEdgeBackgroundRGB D-161] non-uniform reference ` +
          `(spread=${spread.toFixed(0)} > ${UNIFORMITY_THRESHOLD}) — ` +
          `falling back to pure white padding. samples=` +
          JSON.stringify(compactSamples),
      )
      return NEUTRAL_WHITE
    }

    const r = samples.reduce((s, p) => s + p.r, 0) / 4
    const g = samples.reduce((s, p) => s + p.g, 0) / 4
    const b = samples.reduce((s, p) => s + p.b, 0) / 4
    console.log(
      `[sampleEdgeBackgroundRGB D-161] uniform reference ` +
        `(spread=${spread.toFixed(0)}) — sampled avg rgb(` +
        `${Math.round(r)},${Math.round(g)},${Math.round(b)}) ` +
        `samples=${JSON.stringify(compactSamples)}`,
    )
    return { r: Math.round(r), g: Math.round(g), b: Math.round(b), alpha: 1 }
  } catch (err) {
    console.warn(
      '[sampleEdgeBackgroundRGB D-161] failed — fallback to pure white:',
      err instanceof Error ? err.message : err,
    )
    return NEUTRAL_WHITE
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type ProviderResult = {
  provider: string
  promptCount: number
  successCount: number
  buffers: Buffer[]
  errors: string[]
}

/** Per-slot execution log — stored in ImageGenerationJob for admin debugging */
export type SlotLog = {
  slot: string
  label: string
  provider: string
  attempts: number        // 1 = first try, 2 = retried
  success: boolean
  outputSizeBytes?: number
  colorCheckPass?: boolean
  detectedColor?: string
  /** v12: brand fidelity check result */
  brandFidelityPass?: boolean
  brandFidelityScore?: 'good' | 'degraded' | 'failed'
  brandFidelityNotes?: string
  /** v20: shot composition compliance check */
  shotCompliancePass?: boolean
  detectedShot?: string
  rejectionReason?: string
}

/**
 * A brand-critical local zone on the shoe that must be preserved in all generated images.
 * Extracted from the reference photo by Gemini Vision (Step B extension).
 */
export type ProtectedZone = {
  name: string          // e.g. "tongue_label", "side_branding", "heel_tab", "ankle_patch"
  description: string   // e.g. "Nike Swoosh logo on white rectangular tongue patch"
  mustPreserve: string  // e.g. "swoosh shape, white on black background, centered on tongue"
  visibility: 'high' | 'medium' | 'low'
}

/** Result from a post-generation brand fidelity check (Step D extension) */
type BrandFidelityResult = {
  pass: boolean
  overallScore: 'good' | 'degraded' | 'failed'
  zones: Array<{ zone: string; pass: boolean; note: string }>
  reinforcementHint: string
}

/** Result from pre-generation image validation (Step A) */
export type ValidationResult = {
  valid: boolean
  confidence: 'high' | 'medium' | 'low'
  productClass?: string
  rejectionReason?: string
}

/**
 * Structured product identity lock (Step B).
 * promptBlock is injected into every slot prompt.
 * Structured fields stored as job metadata + used for color checking.
 */
export type IdentityLock = {
  promptBlock: string
  productClass: string
  mainColor: string
  accentColor?: string
  material: string
  toeShape?: string
  soleProfile?: string
  heelProfile?: string
  closureType?: string
  distinctiveFeatures?: string
  /** Camera angle detected in the reference photo, e.g. "45° front-left" */
  referenceAngle?: string
  /** v12: brand-critical local zones extracted from reference photo */
  protectedZones?: ProtectedZone[]
  /** v12: pre-built prompt section for protected zones, injected per slot */
  protectedZoneBlock?: string
  // D-232: PI-Bot-style richer fields piped INTO the per-slot prompt as
  // additional "preserve exactly" anchors. Aim is tighter fidelity to the
  // reference photo (visible logos/text, accent positions, sole detail,
  // construction stitches). Does NOT solve gpt-image-1's silhouette drift
  // — only narrows describable-feature drift.
  brandTechnologies?: string[]   // ["Air-Cooled Memory Foam", "Boost"]
  colorAccents?: string[]        // ["white laces", "black heel cap", "gum sole edge"]
  constructionNotes?: string     // "T-toe stitching, gum rubber sole with serrated edge"
  visualNotes?: string           // free-form prose: logo positions, visible text, signature details
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ─────────────────────────────────────────────────────────────────────────────
// Step A — Input Validation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Uses Gemini Vision to check if the image is a valid shoe/footwear product photo.
 * On API failure: defaults to valid=true (don't block legitimate requests).
 */
export async function validateProductImage(
  imageBuffer: Buffer,
  imageMime: string,
  apiKey: string,
): Promise<ValidationResult> {
  const visionModel = 'gemini-2.5-flash'

  const prompt =
    `You are an image classifier for a shoe e-commerce platform. ` +
    `Analyze this image and determine if it shows a shoe or footwear product as the PRIMARY subject. ` +
    `Respond with a JSON object ONLY — no explanation, no markdown, no code fences. ` +
    `Required fields:\n` +
    `- "valid": true if main subject is a shoe/footwear, false otherwise\n` +
    `- "confidence": "high" if clearly footwear, "medium" if somewhat unclear, "low" if uncertain\n` +
    `- "productClass": footwear type if valid (e.g. "sneaker", "oxford", "boot", "loafer")\n` +
    `- "rejectionReason": brief reason if not valid (e.g. "selfie", "room interior", "no shoe visible")\n`

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${visionModel}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [
            { inlineData: { mimeType: imageMime, data: imageBuffer.toString('base64') } },
            { text: prompt },
          ] }],
          generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 200 },
        }),
      },
    )

    if (!res.ok) {
      console.warn(`[validateProductImage] HTTP ${res.status}`)
      return { valid: true, confidence: 'low', rejectionReason: 'validation API unavailable' }
    }

    const data = await res.json()
    const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) return { valid: true, confidence: 'low' }

    const parsed = JSON.parse(text.trim())
    const result: ValidationResult = {
      valid: parsed.valid ?? true,
      confidence: parsed.confidence ?? 'medium',
      productClass: parsed.productClass,
      rejectionReason: parsed.rejectionReason,
    }
    console.log(`[validateProductImage] valid=${result.valid} confidence=${result.confidence} class=${result.productClass || '-'}`)
    return result
  } catch (err) {
    console.warn('[validateProductImage] error:', err instanceof Error ? err.message : err)
    return { valid: true, confidence: 'low' }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Step B — Identity Lock Extraction
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Uses Gemini Vision to extract a 10-field structured identity from the reference
 * shoe photo, including the detected camera angle of the reference.
 * Returns null on failure; caller should use a minimal fallback.
 */
export async function extractIdentityLock(
  imageBuffer: Buffer,
  imageMime: string,
  apiKey: string,
): Promise<IdentityLock | null> {
  const visionModel = 'gemini-2.5-flash'

  const prompt =
    `You are a product photography expert. Analyze this shoe photo and extract a precise identity description. ` +
    `Respond with a JSON object ONLY — no explanation, no markdown, no code fences. Required fields:\n` +
    `- "productClass": specific type (e.g. "low-top lace-up sneaker", "wingtip brogue oxford", "chelsea boot")\n` +
    `- "mainColor": primary color of the upper — be EXACT (e.g. "black", "tan brown", "all-white", "navy blue")\n` +
    `- "accentColor": secondary color if distinct (e.g. "white sole", "red laces") — omit if none\n` +
    `- "material": upper material (e.g. "smooth full-grain leather", "nubuck suede", "knit mesh")\n` +
    `- "toeShape": one of "round", "pointed", "square", "almond"\n` +
    `- "soleProfile": (e.g. "flat thin rubber", "chunky lug sole", "stacked leather heel")\n` +
    `- "heelProfile": (e.g. "flat", "block heel 3cm", "stacked 2cm")\n` +
    `- "closureType": (e.g. "lace-up", "slip-on", "side-zip", "chelsea elastic")\n` +
    `- "distinctiveFeatures": comma-separated details (e.g. "brogue perforations, contrast stitching")\n` +
    `- "referenceAngle": the camera angle in THIS photo (e.g. "45° front-left", "straight front", "overhead", "side profile")\n` +
    // D-232: richer identity-anchoring fields, modeled on PI Bot's analyzeProduct schema.
    `- "brandTechnologies": array of visible/printed brand-tech names (e.g. ["Air-Cooled Memory Foam", "Boost", "Flyknit"]). Empty array if none visible.\n` +
    `- "colorAccents": array of secondary color positions on the shoe (e.g. ["white laces", "black heel counter", "gum-rubber sole edge", "navy heel pull"]). Empty array if none.\n` +
    `- "constructionNotes": short prose describing visible construction/stitching details (e.g. "T-toe stitching, gum rubber outsole with serrated rand, foxing tape along midsole"). Empty string if nothing distinctive.\n` +
    `- "visualNotes": free-form prose listing every visible non-color identity detail — logo positions, printed text, signature design elements, hardware (e.g. "Adidas trefoil on tongue, three perforated stripes on lateral side, gum outsole, T-toe overlay, serrated foxing rand"). Be specific and exhaustive — this anchors the regenerated image.\n` +
    `- "protectedZones": array of brand-critical visible zones. Include ONLY zones where a logo, text mark, ` +
    `stripe pattern, or distinctive graphic element is CLEARLY VISIBLE. For each zone include:\n` +
    `  - "name": one of "tongue_label" | "side_branding" | "heel_tab" | "toe_cap_overlay" | "ankle_patch" | "other"\n` +
    `  - "description": exactly what is visible (e.g. "white Nike Swoosh on black tongue patch", "three white parallel stripes on lateral side")\n` +
    `  - "mustPreserve": what specifically must not change (e.g. "swoosh shape and white-on-black contrast", "exactly 3 stripes, white, evenly spaced")\n` +
    `  - "visibility": "high" if clearly prominent, "medium" if visible but small, "low" if very subtle\n` +
    `  If no branding/logos/marks are visible, return an empty array [].\n` +
    `Be extremely precise on color — black vs brown vs tan matters enormously.`

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${visionModel}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [
            { inlineData: { mimeType: imageMime, data: imageBuffer.toString('base64') } },
            { text: prompt },
          ] }],
          // D-232: bumped 900 → 2048. Schema gained 4 new fields (one of
          // them an exhaustive prose `visualNotes`). Gemini 2.5-flash's
          // thinking-token overhead consumes the budget before visible
          // output — see feedback_gemini_token_budget.md.
          generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 2048 },
        }),
      },
    )

    if (!res.ok) {
      // D-157: log status body so quota/rate-limit/model errors are visible
      const errBody = await res.text().catch(() => '')
      console.warn(`[extractIdentityLock] HTTP ${res.status} body=${errBody.slice(0, 300)}`)
      return null
    }

    const data = await res.json()
    const finishReason = data?.candidates?.[0]?.finishReason as string | undefined
    const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) {
      // D-157: surface finishReason (SAFETY, MAX_TOKENS, RECITATION, etc.)
      console.warn(`[extractIdentityLock] no text in response — finishReason=${finishReason ?? 'unknown'}`)
      return null
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let p: any
    try {
      p = JSON.parse(text.trim())
    } catch (parseErr) {
      // D-157: JSON parse failures are a major fallback source — log the raw text
      console.warn(
        `[extractIdentityLock] JSON parse failed — finishReason=${finishReason ?? 'unknown'} ` +
        `textLen=${text.length} textPreview=${text.slice(0, 200).replace(/\s+/g, ' ')} ` +
        `err=${parseErr instanceof Error ? parseErr.message : String(parseErr)}`,
      )
      return null
    }
    const productClass = p.productClass || 'shoe'
    const mainColor    = p.mainColor    || 'as shown'
    const material     = p.material     || 'as shown'
    const refAngle     = p.referenceAngle || 'unknown angle'

    // D-232: parse the new richer fields. All optional — empty arrays /
    // empty strings are treated as "not present" and skipped in the prompt.
    const asStrArr = (v: unknown): string[] =>
      Array.isArray(v)
        ? v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).map((x) => x.trim())
        : []
    const asStr = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')
    const brandTechnologies = asStrArr(p.brandTechnologies)
    const colorAccents      = asStrArr(p.colorAccents)
    const constructionNotes = asStr(p.constructionNotes)
    const visualNotes       = asStr(p.visualNotes)

    // Build structured prompt block with aggressive color locking
    const promptBlock = [
      `═══ PRODUCT IDENTITY LOCK ═══`,
      `Product  : ${productClass}`,
      `Color    : ${mainColor}` + (p.accentColor ? ` (accent: ${p.accentColor})` : ''),
      `Material : ${material}`,
      p.toeShape ?      `Toe      : ${p.toeShape}` : null,
      p.soleProfile ?   `Sole     : ${p.soleProfile}` : null,
      p.heelProfile ?   `Heel     : ${p.heelProfile}` : null,
      p.closureType ?   `Closure  : ${p.closureType}` : null,
      p.distinctiveFeatures ? `Details  : ${p.distinctiveFeatures}` : null,
      // D-232: richer "preserve exactly" anchors. Each is rendered only when
      // the vision call returned a non-empty value, so the prompt stays
      // compact for products with sparse visible identity markers.
      brandTechnologies.length > 0
        ? `BrandTech: ${brandTechnologies.join(', ')} (visible/printed on shoe — preserve exact text and position)`
        : null,
      colorAccents.length > 0
        ? `Accents  : ${colorAccents.join(', ')} (preserve each accent in its exact position and color)`
        : null,
      constructionNotes
        ? `Build    : ${constructionNotes} (preserve every described stitch/seam/edge exactly)`
        : null,
      visualNotes
        ? `Visual   : ${visualNotes}`
        : null,
      ``,
      `COLOR LOCK: This shoe is ${mainColor.toUpperCase()}. Output MUST be ${mainColor.toUpperCase()}.`,
      `If you generate a shoe in a different color, the output is WRONG and will be rejected.`,
      ``,
      `NEVER DO ANY OF THESE:`,
      `• Change the color (${mainColor} must stay ${mainColor} — not darker, not lighter, not a different hue)`,
      `• Change material from ${material}`,
      `• Change product type from ${productClass}`,
      `• Add or remove design features`,
      `• Replace with a similar but different shoe`,
      `• Invent logos, patterns, or decorative elements`,
      `• Change sole shape or thickness`,
      p.closureType ? `• Change the ${p.closureType} closure` : null,
      // D-232: forbid drift on the new anchors when present.
      brandTechnologies.length > 0
        ? `• Drop, rename, or relocate any brand-tech text (${brandTechnologies.join(' / ')})`
        : null,
      colorAccents.length > 0
        ? `• Move, recolor, or remove any of the listed color accents`
        : null,
      ``,
      `REFERENCE ANGLE: The reference photo was taken from ${refAngle}.`,
      `DO NOT simply reproduce this same angle. Generate the specific angle requested below.`,
      `═══════════════════════════`,
      ``,
    ].filter(Boolean).join('\n')

    // Parse protected zones (v12)
    const rawZones: unknown[] = Array.isArray(p.protectedZones) ? p.protectedZones : []
    const protectedZones: ProtectedZone[] = rawZones
      .filter((z): z is Record<string, unknown> => typeof z === 'object' && z !== null && typeof (z as Record<string, unknown>).name === 'string')
      .map((z) => ({
        name: String(z.name),
        description: String(z.description || ''),
        mustPreserve: String(z.mustPreserve || 'preserve as shown'),
        visibility: (['high', 'medium', 'low'] as const).includes(z.visibility as 'high' | 'medium' | 'low')
          ? (z.visibility as 'high' | 'medium' | 'low')
          : 'medium',
      }))
      .filter((z) => z.description.length > 0)

    const protectedZoneBlock = buildProtectedZoneBlock(protectedZones)

    console.log(
      `[extractIdentityLock D-232] ✓ ${productClass} | ${mainColor} | ${material} | ref=${refAngle} | ` +
      `zones=${protectedZones.length} (${protectedZones.map((z) => z.name).join(',') || 'none'}) | ` +
      `tech=${brandTechnologies.length} accents=${colorAccents.length} ` +
      `build=${constructionNotes ? 'y' : 'n'} visual=${visualNotes ? `${visualNotes.length}c` : 'n'}`,
    )

    return {
      promptBlock,
      productClass,
      mainColor,
      accentColor: p.accentColor,
      material,
      toeShape: p.toeShape,
      soleProfile: p.soleProfile,
      heelProfile: p.heelProfile,
      closureType: p.closureType,
      distinctiveFeatures: p.distinctiveFeatures,
      referenceAngle: refAngle,
      protectedZones,
      protectedZoneBlock,
      // D-232: surface the new richer fields on the IdentityLock so they
      // can be inspected in slot logs / job audit trails.
      brandTechnologies: brandTechnologies.length > 0 ? brandTechnologies : undefined,
      colorAccents: colorAccents.length > 0 ? colorAccents : undefined,
      constructionNotes: constructionNotes || undefined,
      visualNotes: visualNotes || undefined,
    }
  } catch (err) {
    console.warn('[extractIdentityLock] error:', err instanceof Error ? err.message : err)
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Protected Zone Prompt Block Builder
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a prompt section that explicitly names and locks each protected zone.
 * Injected into the generation prompt between the global identity block and
 * the scene-specific instructions.
 * Returns empty string if no meaningful zones exist.
 */
function buildProtectedZoneBlock(zones: ProtectedZone[]): string {
  const visibleZones = zones.filter((z) => z.visibility !== 'low' && z.description.length > 0)
  if (visibleZones.length === 0) return ''

  const lines: string[] = [
    `═══ PROTECTED BRAND ZONES — MUST NOT CHANGE ═══`,
    `The following brand/identity zones MUST be reproduced faithfully from the reference.`,
    ``,
  ]

  for (const zone of visibleZones) {
    const zoneTitle = zone.name.toUpperCase().replace(/_/g, ' ')
    lines.push(`${zoneTitle}: ${zone.description}`)
    lines.push(`  • PRESERVE: ${zone.mustPreserve}`)
    lines.push(`  • DO NOT invent fake text, logos, or brand marks here.`)
    lines.push(``)
  }

  lines.push(
    `BRAND FIDELITY RULE: If you cannot exactly reproduce a brand mark, render that zone`,
    `as a subtle/blurred shape rather than inventing fictional brand text (e.g. "COLIDAS",`,
    `"ADIBAS", or any made-up brand name). A blurred logo is better than a fake logo.`,
    `═══════════════════════════`,
    ``,
  )

  return lines.join('\n')
}

// ─────────────────────────────────────────────────────────────────────────────
// Step D — Per-Slot Color Check
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Quick Gemini Vision check: does the generated shoe match the expected color?
 * Returns { match, detectedColor }.
 * On failure: defaults to match=true (don't reject on transient API error).
 */
async function checkColorMatch(
  generatedImage: Buffer,
  expectedColor: string,
  apiKey: string,
): Promise<{ match: boolean; detectedColor: string }> {
  const visionModel = 'gemini-2.5-flash'

  const prompt =
    `What is the PRIMARY color of the shoe in this image? ` +
    `Reply JSON only: {"detectedColor": "...", "match": true/false}\n` +
    `Expected color: ${expectedColor}\n` +
    `"match" = true if the shoe color is clearly "${expectedColor}" or very close. ` +
    `"match" = false if the shoe is a noticeably different color (e.g. expected "black" but shoe is brown/tan/grey).`

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${visionModel}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [
            { inlineData: { mimeType: 'image/jpeg', data: generatedImage.toString('base64') } },
            { text: prompt },
          ] }],
          generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 100 },
        }),
      },
    )

    if (!res.ok) {
      console.warn(`[checkColorMatch] HTTP ${res.status}`)
      return { match: true, detectedColor: 'unknown' }
    }

    const data = await res.json()
    const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) return { match: true, detectedColor: 'unknown' }

    const parsed = JSON.parse(text.trim())
    const result = {
      match: parsed.match ?? true,
      detectedColor: parsed.detectedColor || 'unknown',
    }
    console.log(`[checkColorMatch] expected=${expectedColor} detected=${result.detectedColor} match=${result.match}`)
    return result
  } catch (err) {
    console.warn('[checkColorMatch] error:', err instanceof Error ? err.message : err)
    return { match: true, detectedColor: 'unknown' }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Step D2 — Per-Slot Brand Fidelity Check (v12)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Uses Gemini Vision to evaluate whether the generated image faithfully preserved
 * the protected brand zones extracted from the reference.
 *
 * Only called when identityLock.protectedZones has high/medium visibility zones.
 * On API failure: defaults to pass=true (never block on transient errors).
 *
 * Key concern: invented/changed brand text (e.g. "COLIDAS" instead of original logo).
 */
async function checkBrandFidelity(
  generatedImage: Buffer,
  protectedZones: ProtectedZone[],
  apiKey: string,
): Promise<BrandFidelityResult> {
  const visionModel = 'gemini-2.5-flash'

  const visibleZones = protectedZones.filter((z) => z.visibility !== 'low')
  if (visibleZones.length === 0) {
    return { pass: true, overallScore: 'good', zones: [], reinforcementHint: '' }
  }

  const zoneDescriptions = visibleZones
    .map((z) => `- ${z.name}: "${z.description}" (must preserve: ${z.mustPreserve})`)
    .join('\n')

  const prompt =
    `You are evaluating whether a generated shoe image faithfully preserved the original product's brand zones.\n\n` +
    `EXPECTED ZONES from the original reference shoe:\n${zoneDescriptions}\n\n` +
    `Look at this generated shoe image and evaluate each zone:\n` +
    `- Is the zone present and visually consistent with the expected description?\n` +
    `- Was any text INVENTED or changed? (e.g. "COLIDAS" instead of the original brand)\n` +
    `- Was a logo shape changed or replaced with a different brand symbol?\n\n` +
    `Reply JSON only — no markdown, no code fences:\n` +
    `{\n` +
    `  "pass": true/false,\n` +
    `  "overallScore": "good" | "degraded" | "failed",\n` +
    `  "zones": [{ "zone": "...", "pass": true/false, "note": "brief observation" }],\n` +
    `  "reinforcementHint": "brief description of what failed and what the correct zone should look like"\n` +
    `}\n` +
    `"pass" = true if all high-visibility brand zones look faithful (or are stylized/blurred but not replaced with fake text).\n` +
    `"pass" = false ONLY if a zone clearly shows invented/fake text, a wrong brand name, or a completely different logo.`

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${visionModel}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [
            { inlineData: { mimeType: 'image/jpeg', data: generatedImage.toString('base64') } },
            { text: prompt },
          ] }],
          generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 400 },
        }),
      },
    )

    if (!res.ok) {
      console.warn(`[checkBrandFidelity] HTTP ${res.status}`)
      return { pass: true, overallScore: 'good', zones: [], reinforcementHint: '' }
    }

    const data = await res.json()
    const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) return { pass: true, overallScore: 'good', zones: [], reinforcementHint: '' }

    const parsed = JSON.parse(text.trim()) as Partial<BrandFidelityResult>
    const result: BrandFidelityResult = {
      pass:               parsed.pass          ?? true,
      overallScore:       parsed.overallScore   ?? 'good',
      zones:              Array.isArray(parsed.zones) ? parsed.zones : [],
      reinforcementHint:  parsed.reinforcementHint ?? '',
    }

    console.log(
      `[checkBrandFidelity] pass=${result.pass} score=${result.overallScore}` +
      (result.reinforcementHint ? ` hint="${result.reinforcementHint.slice(0, 100)}"` : ''),
    )
    return result
  } catch (err) {
    console.warn('[checkBrandFidelity] error:', err instanceof Error ? err.message : err)
    return { pass: true, overallScore: 'good', zones: [], reinforcementHint: '' }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Step D3 — Per-Slot Shot Compliance Check (v20)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Gemini Vision check: does the generated image actually match the intended shot type?
 * Catches angle drift — e.g. Gemini generating a 3/4 view instead of a pure 90° side
 * profile, or a near-front instead of the required dead-straight front.
 *
 * Each slot has precise pass/fail criteria. On API failure defaults to pass=true
 * (never block on transient errors).
 *
 * Returns { pass, detectedShot, correctionHint } where correctionHint is pre-formatted
 * for direct injection into the retry preamble.
 *
 * D-409: DISABLED / retained for reference. No longer called — D-407 loosened the
 * composition rule and D-408 makes centering deterministic, so per-slot angle
 * verification is redundant and was a major rate-limit / extra-regeneration cost.
 * Kept (with SHOT_CRITERIA) so it can be re-enabled if a future need appears.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function checkShotCompliance(
  generatedImage: Buffer,
  slotName: string,
  apiKey: string,
): Promise<{ pass: boolean; detectedShot: string; correctionHint: string }> {
  const visionModel = 'gemini-2.5-flash'

  // D-407: per-slot criteria for the fixed 5-slot contract. LOOSE by design —
  // they check that the shot serves the slot's PURPOSE, the product is CENTERED
  // and fully framed, and the studio background/identity discipline holds. They
  // do NOT enforce exact degrees/geometry (the model chooses composition).
  // Slot keys mirror imageSlotContract.GENERATED_SLOT_KEYS.
  const SHOT_CRITERIA: Record<string, {
    required: string
    passRule: string
    failSignals: string
    correction: string
  }> = {
    hero_3q: {
      required: 'three-quarter hero — front and one side visible together, product centered on the clean studio backdrop',
      passRule: 'the shoe is shown from a three-quarter angle (front and one side both visible), centered and fully in frame on a clean studio background',
      failSignals: 'dead-on front only, pure side profile only, rear/heel-only view, lifestyle or outdoor scene, foot or person visible, shoe strongly off-center or cropped out of frame',
      correction: 'Show a THREE-QUARTER hero (front + one side together), product centered and fully in frame on the clean ivory studio backdrop.',
    },
    side: {
      required: 'side presentation — the full silhouette/profile reads from toe to heel, product centered on the clean studio backdrop',
      passRule: 'the shoe is shown from the side with its full profile visible toe-to-heel, centered and fully in frame on a clean studio background',
      failSignals: 'dead-on front only, rear/heel-only view, extreme macro, lifestyle or outdoor scene, foot or person visible, shoe strongly off-center or cut off',
      correction: 'Show the SIDE profile of the shoe with the full silhouette visible from toe to heel, product centered and fully in frame on the clean ivory studio backdrop.',
    },
    top: {
      required: 'top / overview presentation — the product seen from above as a clean catalog overview, ONE shoe, centered on the clean studio backdrop',
      passRule: 'the shoe is shown from an elevated/top overview and is centered and fully in frame on a clean studio background',
      failSignals: 'a second/extra shoe invented, straight side profile only, lifestyle or outdoor scene, foot or person visible, shoe strongly off-center or cropped',
      correction: 'Show a TOP / OVERVIEW of the SAME single shoe from above, centered and fully in frame on the clean ivory studio backdrop. Do NOT add a second shoe or any extra object.',
    },
    back: {
      required: 'rear / heel presentation — the back of the shoe and heel read clearly, product centered on the clean studio backdrop',
      passRule: 'the rear/heel of the shoe is the dominant view and the shoe is centered and fully in frame on a clean studio background',
      failSignals: 'dead-on front only, pure side profile with no rear visible, lifestyle or outdoor scene, foot or person visible, shoe strongly off-center or cropped',
      correction: 'Show the REAR / HEEL of the shoe as the main view, product centered and fully in frame on the clean ivory studio backdrop. Keep unseen rear detail plain — do not invent it.',
    },
    detail: {
      required: 'material detail close-up — texture / stitching / grain / sole edge that is visible in the reference fills most of the frame, on the clean studio backdrop',
      passRule: 'a close detail of the real material/stitching/texture/sole edge fills most of the frame on a clean studio background',
      failSignals: 'a distant full-shoe shot with no detail emphasis, worn on a foot, a person visible, lifestyle or outdoor environment, invented ornament/logo',
      correction: 'Show a CLOSE material detail (texture, stitching, grain, or sole edge) that is actually visible in the reference, filling most of the frame on the clean ivory studio backdrop. Show only real, visible detail.',
    },
  }

  const criteria = SHOT_CRITERIA[slotName]
  if (!criteria) return { pass: true, detectedShot: 'unknown', correctionHint: '' }

  const prompt =
    `You are evaluating whether a generated shoe photo matches the required shot type.\n\n` +
    `REQUIRED SHOT TYPE: ${criteria.required}\n` +
    `PASS if: ${criteria.passRule}\n` +
    `FAIL if any of these are true: ${criteria.failSignals}\n\n` +
    `Analyze this shoe image and respond with JSON only — no markdown, no code fences:\n` +
    `{"pass": true/false, "detectedShot": "one-sentence description of the actual angle/composition in this image"}\n\n` +
    `Be strict. A slight 3/4 angle when pure front was requested = FAIL. ` +
    `A slight diagonal when pure side was requested = FAIL.`

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${visionModel}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [
            { inlineData: { mimeType: 'image/jpeg', data: generatedImage.toString('base64') } },
            { text: prompt },
          ] }],
          generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 120 },
        }),
      },
    )

    if (!res.ok) {
      console.warn(`[checkShotCompliance] HTTP ${res.status}`)
      return { pass: true, detectedShot: 'unknown', correctionHint: '' }
    }

    const data = await res.json()
    const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) return { pass: true, detectedShot: 'unknown', correctionHint: '' }

    const parsed = JSON.parse(text.trim())
    const pass = parsed.pass ?? true
    const detectedShot = parsed.detectedShot || 'unknown'
    const correctionHint = pass ? '' :
      `CRITICAL SHOT CORRECTION: The output shows "${detectedShot}" but this slot requires: ` +
      `${criteria.required}. ${criteria.correction}`

    console.log(
      `[checkShotCompliance] slot=${slotName} pass=${pass} detected="${detectedShot.slice(0, 80)}"`,
    )
    return { pass, detectedShot, correctionHint }
  } catch (err) {
    console.warn('[checkShotCompliance] error:', err instanceof Error ? err.message : err)
    return { pass: true, detectedShot: 'unknown', correctionHint: '' }
  }
}

/**
 * D-201: Check shoe orientation in the SIDE slot images.
 * Asks Gemini Vision a simple binary question: "Is the toe pointing LEFT or RIGHT?"
 * Returns 'left' | 'right' | 'unknown'.
 *
 * If the toe points RIGHT (wrong per operator rule), the caller should flop() the image.
 */
async function checkShoeOrientation(
  imageBuffer: Buffer,
  geminiKey: string,
): Promise<'left' | 'right' | 'unknown'> {
  try {
    const b64 = imageBuffer.toString('base64')
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text:
                    'Look at this shoe photograph. The shoe is shown from the side.\n\n' +
                    'Which direction is the TOE (front) of the shoe pointing?\n\n' +
                    'Answer with EXACTLY one word: LEFT or RIGHT\n\n' +
                    'LEFT means the toe points toward the left edge of the image.\n' +
                    'RIGHT means the toe points toward the right edge of the image.',
                },
                { inlineData: { mimeType: 'image/jpeg', data: b64 } },
              ],
            },
          ],
          generationConfig: { temperature: 0, maxOutputTokens: 10 },
        }),
        signal: AbortSignal.timeout(15_000),
      },
    )

    if (!res.ok) {
      console.warn(`[checkShoeOrientation] HTTP ${res.status}`)
      return 'unknown'
    }

    const data = (await res.json()) as Record<string, unknown>
    const text = (
      ((data.candidates as Array<Record<string, unknown>>)?.[0]?.content as Record<string, unknown>)
        ?.parts as Array<{ text?: string }>
    )?.[0]?.text?.trim().toUpperCase() ?? ''

    if (text.includes('LEFT')) return 'left'
    if (text.includes('RIGHT')) return 'right'
    console.warn(`[checkShoeOrientation] ambiguous response: "${text}"`)
    return 'unknown'
  } catch (err) {
    console.warn('[checkShoeOrientation] error:', err instanceof Error ? err.message : err)
    return 'unknown'
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// OpenAI gpt-image-1 Image Edit (the ONLY image generator)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Call OpenAI /v1/images/edits with gpt-image-1.
 * quality: 'medium'. Requires "image[]" field name.
 */
async function callGPTImageEdit(
  pngBuffer: Buffer,
  prompt: string,
  apiKey: string,
): Promise<Buffer | null> {
  const model = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1'

  try {
    console.log(`[GPTImageEdit] POST /v1/images/edits — promptLen=${prompt.length}`)

    const formData = new FormData()
    formData.append('model', model)
    formData.append('prompt', prompt)
    formData.append('n', '1')
    formData.append('size', '1024x1024')
    formData.append('quality', 'high')
    formData.append('image[]', new Blob([new Uint8Array(pngBuffer)], { type: 'image/png' }), 'product.png')

    const res = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error(`[GPTImageEdit] HTTP ${res.status}: ${errText.slice(0, 500)}`)
      return null
    }

    const data = (await res.json()) as { data?: Array<{ b64_json?: string; url?: string }> }
    const img = data?.data?.[0]

    if (img?.b64_json) {
      const buf = Buffer.from(img.b64_json, 'base64')
      console.log(`[GPTImageEdit] ✓ ${buf.length}b`)
      return buf
    }
    if (img?.url) {
      const imgRes = await fetch(img.url)
      if (imgRes.ok) {
        const buf = Buffer.from(await imgRes.arrayBuffer())
        console.log(`[GPTImageEdit] ✓ ${buf.length}b`)
        return buf
      }
    }

    console.error('[GPTImageEdit] No image in response')
    return null
  } catch (err) {
    console.error('[GPTImageEdit] error:', err instanceof Error ? err.message : err)
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5-Slot Editing Scenes — v9 (aggressive physical separation + color lock)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * D-407: EDITING_SCENES is now derived from the central 5-slot contract
 * (src/lib/imageSlotContract.ts) — the single source of truth for slot types,
 * order, and the centering/framing discipline.
 *
 * Canonical slot order (index → key):
 *   0 front · 1 side · 2 top_pair · 3 heel · 4 material_detail
 *
 * Each scene keeps the { name, label, sceneInstructions } shape and the
 * {COLOR}/{BACKGROUND}/{REF_ANGLE} placeholders resolved below, so the rest of
 * the pipeline (identity lock, material lock, visual fact lock, anti-frame,
 * prohibitions) is unchanged. Per operator rule D-407 the scenes intentionally
 * describe LOOSE composition intent (no hardcoded degrees/geometry) plus the
 * fixed centering discipline — the model chooses the best exact composition.
 */
const EDITING_SCENES = GENERATED_SCENES

// ─────────────────────────────────────────────────────────────────────────────
// Pipeline A — generateByEditing (THE ONLY generation path)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * STRICT OpenAI-only generation pipeline.
 *
 * For each selected slot:
 *   1. Generate with gpt-image-1 /v1/images/edits
 *   2. Check color match via Gemini Vision
 *   3. If color drifted → retry once with reinforced color prompt
 *   4. Record slotLog
 *
 * Reference image is resized to 768×768 then padded to 1024×1024 (128px white border)
 * to give the model visual room for recomposition.
 *
 * @param referenceImage    Raw bytes of the product photo
 * @param referenceImageMime MIME type
 * @param identityLock      Full IdentityLock object from extractIdentityLock()
 * @param sceneIndices      Which EDITING_SCENES indices to run (0-based). Default: all 5.
 *                          Stage 1 (standard): [0, 1, 2]  — front, side, macro
 *                          Stage 2 (premium):  [3, 4]     — editorial, lifestyle
 */
export async function generateByEditing(
  referenceImage: Buffer,
  referenceImageMime: string,
  identityLock: IdentityLock,
  sceneIndices?: number[],
  _additionalImages?: Array<{ data: Buffer; mime: string }>, // reserved — OpenAI path uses only primary ref
  productId?: string | number, // D-233: stable per-product background variant
  visualFacts?: string | null, // D-355N: operator-verified product facts (visual fact lock override)
): Promise<{ results: ProviderResult[]; buffers: Buffer[]; slotLogs: SlotLog[] }> {
  // Filter scenes to run — default is all 5
  const scenes = sceneIndices
    ? EDITING_SCENES.filter((_, i) => sceneIndices.includes(i))
    : [...EDITING_SCENES]

  const result: ProviderResult = {
    provider: 'gpt-image-edit',
    promptCount: scenes.length,
    successCount: 0,
    buffers: [],
    errors: [],
  }

  const slotLogs: SlotLog[] = []
  const geminiKey = process.env.GEMINI_API_KEY

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    const msg = 'OPENAI_API_KEY not set — generation impossible'
    console.error(`[generateByEditing] ${msg}`)
    result.errors.push(msg)
    return { results: [result], buffers: [], slotLogs }
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const sharp = require('sharp') as typeof import('sharp')
    console.log(
      `[generateByEditing v12] input=${referenceImage.length}b ` +
      `color=${identityLock.mainColor} refAngle=${identityLock.referenceAngle || '?'} ` +
      `scenes=${scenes.map((s) => s.name).join(',')}`,
    )

    const mainColor    = identityLock.mainColor
    const refAngle     = identityLock.referenceAngle || 'unknown'
    const zoneBlock    = identityLock.protectedZoneBlock || ''
    const hasBrandZones = geminiKey && (identityLock.protectedZones?.length ?? 0) > 0

    // Compute premium background FIRST — used for scene BACKGROUND instruction only
    // D-233: pass productId so two products of the same shoe color get
    // different premium backdrops (cross-slot consistency for any single
    // product still preserved by the v43 invariant).
    const premiumBackground = getBackgroundForColor(mainColor, productId)
    const bgRGB = getBackgroundRGB(premiumBackground)

    // D-167: paddingRGB is no longer used for actual padding (replaced by
    // mirror-extend below). Kept only for logging/audit.
    const paddingRGB = bgRGB // historical ref — see D-167 below

    console.log(
      `[generateByEditing v12] protected zones: ${hasBrandZones ? (identityLock.protectedZones?.map((z) => z.name).join(',')) : 'none'}`,
    )
    console.log(
      `[generateByEditing D-167] scene-bg=${JSON.stringify(bgRGB)} (prompt target) — padding: mirror-extend (no solid color)`,
    )

    // D-167: Mirror-extend padding — PERMANENT frame elimination.
    //
    // The root cause of ALL frame regressions (D-129, D-157, D-161, D-164)
    // was that ANY solid-color padding creates a visible rectangular boundary
    // whenever the reference image's own background differs from the padding
    // color. For a shoe photographed on gray concrete with warm-cream padding,
    // Gemini sees a gray rectangle inside cream and reproduces it as a frame.
    //
    // Fix: use Sharp's `extendWith: 'mirror'` to extend the reference image's
    // edge pixels outward. The background simply continues seamlessly — no
    // boundary, no rectangle, nothing frame-shaped for Gemini to preserve.
    //
    // Step 1: Resize to fit INSIDE 768×768 (no letterbox bars).
    // Step 2: Extend to 768×768 with mirrored edges.
    // Step 3: Extend to 1024×1024 with mirrored edges.
    const refMeta = await sharp(referenceImage).metadata()
    const refW = refMeta.width ?? 768
    const refH = refMeta.height ?? 768
    const innerScale = Math.min(768 / refW, 768 / refH, 1) // never upscale
    const fitW = Math.round(refW * innerScale)
    const fitH = Math.round(refH * innerScale)

    const resizedBuf = await sharp(referenceImage)
      .resize(fitW, fitH)
      .png()
      .toBuffer()

    // Pad to 768×768 with mirrored edges
    const mirrorTop = Math.floor((768 - fitH) / 2)
    const mirrorBottom = 768 - fitH - mirrorTop
    const mirrorLeft = Math.floor((768 - fitW) / 2)
    const mirrorRight = 768 - fitW - mirrorLeft

    const innerBuffer = await sharp(resizedBuf)
      .extend({
        top: mirrorTop, bottom: mirrorBottom,
        left: mirrorLeft, right: mirrorRight,
        extendWith: 'mirror',
      })
      .png()
      .toBuffer()

    // Pad to 1024×1024 with mirrored edges
    const pngBuffer = await sharp(innerBuffer)
      .extend({
        top: 128, bottom: 128, left: 128, right: 128,
        extendWith: 'mirror',
      })
      .png()
      .toBuffer()

    console.log(`[generateByEditing D-167] PNG 1024×1024 ready — ${pngBuffer.length}b (shoe at ${fitW}×${fitH} center, mirror-extend padding — no solid color boundary)`)
    console.log(`[lock-reminder D-153] v50 LOCKED rules prepended to every slot prompt — ${LOCK_REMINDER_BLOCK.length}b reminder block active`)

    for (const scene of scenes) {
      // Replace placeholders in scene instructions
      const sceneText = scene.sceneInstructions
        .replace(/\{COLOR\}/g, mainColor)
        .replace(/\{REF_ANGLE\}/g, refAngle)
        .replace(/\{BACKGROUND\}/g, premiumBackground)

      // Prompt structure (order matters for model attention):
      //   0. LOCK_REMINDER_BLOCK — v50 locked rules reminder (D-153)
      //   1. TASK_FRAMING_BLOCK — "you are re-photographing an existing product"
      //   2. identityLock.promptBlock — product identity + color lock + per-field prohibitions
      //   3. zoneBlock — protected brand zones
      //   4. sceneText — camera angle, framing, background, lighting
      //   5. CANONICAL_PROHIBITIONS_BLOCK — 11 canonical prohibitions from productPreservation.ts
      const isPairSlot = getSlotByKey(scene.name)?.layout === 'pair'
      const fullPrompt = LOCK_REMINDER_BLOCK + TASK_FRAMING_BLOCK + identityLock.promptBlock + zoneBlock + sceneText + STUDIO_STANDARD_BLOCK + materialDirectives(identityLock.material, identityLock.visualNotes) + MATERIAL_IDENTITY_LOCK_BLOCK + buildVisualFactLock(visualFacts) + CANONICAL_PROHIBITIONS_BLOCK + ANTI_FRAME_FINAL_BLOCK + (isPairSlot ? PAIR_MODE_FINAL_BLOCK : '')

      const slotLog: SlotLog = {
        slot: scene.name,
        label: scene.label,
        provider: 'gpt-image-edit',
        attempts: 0,
        success: false,
      }

      let finalBuf: Buffer | null = null

      // ── Attempt 1 ──────────────────────────────────────────────────────────
      slotLog.attempts = 1
      let rawBuf = await callGPTImageEdit(pngBuffer, fullPrompt, apiKey)

      if (rawBuf) {
        const jpegBuf = await sharp(rawBuf).jpeg({ quality: 92 }).toBuffer()

        if (geminiKey) {
          // ── Step D1: Color check ─────────────────────────────────────────
          const colorCheck = await checkColorMatch(jpegBuf, mainColor, geminiKey)
          slotLog.colorCheckPass = colorCheck.match
          slotLog.detectedColor  = colorCheck.detectedColor

          // ── Step D2: Brand fidelity check (v12, only when zones were extracted) ──
          let brandCheck: BrandFidelityResult | null = null
          if (hasBrandZones) {
            brandCheck = await checkBrandFidelity(jpegBuf, identityLock.protectedZones!, geminiKey)
            slotLog.brandFidelityPass  = brandCheck.pass
            slotLog.brandFidelityScore = brandCheck.overallScore
            slotLog.brandFidelityNotes = brandCheck.reinforcementHint || undefined
          }

          const needsRetry = !colorCheck.match || (brandCheck !== null && !brandCheck.pass)

          if (needsRetry) {
            // ── Build combined reinforcement preamble ────────────────────
            const correctionLines: string[] = []
            if (!colorCheck.match) {
              correctionLines.push(
                `CRITICAL COLOR CORRECTION: The previous output was ${colorCheck.detectedColor} ` +
                `but the shoe MUST be ${mainColor}. ${colorCheck.detectedColor} is WRONG. ` +
                `This is a ${mainColor} shoe — generate a ${mainColor} shoe.`,
              )
            }
            if (brandCheck && !brandCheck.pass && brandCheck.reinforcementHint) {
              correctionLines.push(
                `CRITICAL BRAND FIDELITY CORRECTION: ${brandCheck.reinforcementHint} ` +
                `Do NOT invent fake brand text, logos, or marks. ` +
                `Reproduce the exact original branding zones described above.`,
              )
            }
            const reinforcedPrompt = correctionLines.join('\n') + '\n\n' + fullPrompt

            console.warn(
              `[generateByEditing v12] ✗ ${scene.name} fidelity issues — ` +
              `color=${colorCheck.match} brand=${brandCheck?.pass ?? 'skip'} — retrying`,
            )
            slotLog.attempts = 2
            await sleep(2000)

            // ── Attempt 2 (reinforced) ────────────────────────────────────
            rawBuf = await callGPTImageEdit(pngBuffer, reinforcedPrompt, apiKey)
            if (rawBuf) {
              const retryJpeg = await sharp(rawBuf).jpeg({ quality: 92 }).toBuffer()

              // Re-check color
              const retryColor = await checkColorMatch(retryJpeg, mainColor, geminiKey)
              slotLog.colorCheckPass = retryColor.match
              slotLog.detectedColor  = retryColor.detectedColor

              // Re-check brand fidelity
              if (hasBrandZones) {
                const retryBrand = await checkBrandFidelity(retryJpeg, identityLock.protectedZones!, geminiKey)
                slotLog.brandFidelityPass  = retryBrand.pass
                slotLog.brandFidelityScore = retryBrand.overallScore
                slotLog.brandFidelityNotes = retryBrand.reinforcementHint || undefined
              }

              // Build rejection reason summary if still failing after retry
              const warnings: string[] = []
              if (!retryColor.match) warnings.push(`color drift: expected ${mainColor} got ${retryColor.detectedColor}`)
              if (slotLog.brandFidelityPass === false) warnings.push(`brand zones drifted: ${slotLog.brandFidelityNotes || 'unknown'}`)
              if (warnings.length > 0) slotLog.rejectionReason = warnings.join('; ')

              // Accept image regardless — operator can judge from preview
              finalBuf = retryJpeg

              if (warnings.length === 0) {
                console.log(`[generateByEditing v12] ✓ ${scene.name} retry resolved all issues`)
              } else {
                console.warn(`[generateByEditing v12] ⚠ ${scene.name} retry still has issues: ${slotLog.rejectionReason}`)
              }
            }
          } else {
            // First attempt passed all checks
            if (hasBrandZones) {
              console.log(`[generateByEditing v12] ✓ ${scene.name} color+brand ok on first attempt`)
            }
            finalBuf = jpegBuf
          }
        } else {
          // No Gemini key — skip all fidelity checks, accept image
          finalBuf = jpegBuf
        }
      } else {
        // Generation returned null — simple null retry (no fidelity check on null)
        console.warn(`[generateByEditing v12] ✗ ${scene.name} null on attempt 1 — retrying`)
        slotLog.attempts = 2
        await sleep(2000)
        rawBuf = await callGPTImageEdit(pngBuffer, fullPrompt, apiKey)
        if (rawBuf) {
          finalBuf = await sharp(rawBuf).jpeg({ quality: 92 }).toBuffer()
        }
      }

      if (finalBuf) {
        result.buffers.push(finalBuf)
        result.successCount++
        slotLog.success = true
        slotLog.outputSizeBytes = finalBuf.length
        console.log(
          `[generateByEditing v12] ✓ ${scene.name} — ${finalBuf.length}b ` +
          `(attempts=${slotLog.attempts} color=${slotLog.colorCheckPass ?? 'skip'} ` +
          `brand=${slotLog.brandFidelityPass ?? 'skip'})`,
        )
      } else {
        const msg = `${scene.name}: null after ${slotLog.attempts} attempts`
        result.errors.push(msg)
        slotLog.rejectionReason = slotLog.rejectionReason || msg
        console.warn(`[generateByEditing v12] ✗ ${msg}`)
      }

      slotLogs.push(slotLog)
      await sleep(1000)
    }
  } catch (err) {
    const msg = `Pipeline fatal: ${err instanceof Error ? err.message : err}`
    console.error(`[generateByEditing v12] ${msg}`)
    result.errors.push(msg)
  }

  const slotSummary = slotLogs.map((s) => {
    if (!s.success) return '✗'
    if (s.colorCheckPass === false || s.brandFidelityPass === false) return '⚠'
    return '✓'
  }).join('')
  console.log(`[generateByEditing v12] done — ${result.successCount}/${result.promptCount} [${slotSummary}]`)

  return { results: [result], buffers: result.buffers, slotLogs }
}

// ─────────────────────────────────────────────────────────────────────────────
// Gemini Pro Image Generation (v14 — optional premium provider)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Call Gemini image generation model with a reference image + prompt.
 *
 * Model is read from env GEMINI_IMAGE_GEN_MODEL, defaulting to
 * 'gemini-2.5-flash-image' (stable Nano Banana model).
 *
 * Supported alternatives (set via env var):
 *   - gemini-3-pro-image-preview  (strongest quality, preview)
 *   - gemini-3.1-flash-image-preview (fast/efficient, preview)
 *   - gemini-2.5-flash-image (stable, default)
 *
 * API shape: generateContent with responseModalities: ['IMAGE', 'TEXT'].
 * Reference image sent as inlineData (PNG) for style/identity conditioning.
 *
 * To override the model, set GEMINI_IMAGE_GEN_MODEL in Vercel env vars.
 * If the model returns an error or no image part, the function returns null
 * and the caller logs the failure.
 */
async function callGeminiImageGenerate(
  pngBuffer: Buffer,
  prompt: string,
  apiKey: string,
  additionalImages?: Array<{ data: Buffer; mime: string }>,
): Promise<Buffer> {
  const model = process.env.GEMINI_IMAGE_GEN_MODEL || 'gemini-2.5-flash-image'

  // Build parts: text prompt first, then primary reference image, then any additional refs.
  // Multiple reference images give the model a richer view of the product (e.g. front + side).
  const requestParts: Array<Record<string, unknown>> = [
    { text: prompt },
    { inlineData: { mimeType: 'image/png', data: pngBuffer.toString('base64') } },
  ]
  if (additionalImages) {
    for (const img of additionalImages.slice(0, 2)) {
      requestParts.push({
        inlineData: { mimeType: img.mime, data: img.data.toString('base64') },
      })
    }
  }

  try {
    console.log(
      `[GeminiImageGenerate] POST model=${model} promptLen=${prompt.length}` +
      (additionalImages?.length ? ` +${additionalImages.length} additional ref(s)` : ''),
    )

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: requestParts,
          }],
          generationConfig: {
            responseModalities: ['IMAGE', 'TEXT'],
          },
        }),
      },
    )

    if (!res.ok) {
      const errText = await res.text()
      // Parse for a human-readable error message if the response is JSON
      let errDetail = errText.slice(0, 300)
      try {
        const errJson = JSON.parse(errText)
        const msg = errJson?.error?.message as string | undefined
        if (msg) errDetail = msg.slice(0, 200)
      } catch { /* not JSON */ }
      const fullErr = `HTTP ${res.status} model=${model}: ${errDetail}`
      console.error(`[GeminiImageGenerate] ${fullErr}`)
      // Throw instead of returning null so callers can surface the real error to Telegram
      throw new Error(fullErr)
    }

    const data = await res.json()

    // Surface finish_reason if generation was blocked (safety, recitation, etc.)
    const finishReason = data?.candidates?.[0]?.finishReason as string | undefined
    if (finishReason && finishReason !== 'STOP' && finishReason !== 'MAX_TOKENS') {
      const msg = `Gemini blocked finishReason=${finishReason} model=${model}`
      console.warn(`[GeminiImageGenerate] ${msg}`)
      throw new Error(msg)
    }

    const parts: unknown[] = data?.candidates?.[0]?.content?.parts ?? []

    // Find the image part in the response
    for (const part of parts) {
      const p = part as Record<string, unknown>
      const inlineData = p?.inlineData as Record<string, string> | undefined
      if (inlineData?.data) {
        const buf = Buffer.from(inlineData.data, 'base64')
        console.log(`[GeminiImageGenerate] ✓ ${buf.length}b (${inlineData.mimeType || 'image/*'})`)
        return buf
      }
    }

    const noImageMsg = `No image part in response (parts=${parts.length} finishReason=${finishReason ?? 'none'} model=${model})`
    console.error(`[GeminiImageGenerate] ${noImageMsg}`)
    throw new Error(noImageMsg)
  } catch (err) {
    // Re-throw so generateByGeminiPro can catch it per-slot and surface to Telegram
    throw err instanceof Error ? err : new Error(String(err))
  }
}

/**
 * OPTIONAL PREMIUM PROVIDER (v14): Gemini Pro image generation pipeline.
 *
 * Drop-in replacement for generateByEditing() — same signature, same scene
 * definitions, same color/brand checks. Differs only in the underlying
 * image generation API call (Gemini Pro vs OpenAI gpt-image-1).
 *
 * Selection: pass sceneIndices + call from imageGenTask when provider='gemini-pro'.
 * Default provider remains OpenAI (generateByEditing). This is additive only.
 *
 * Use cases: premium editorial slots, logo/text-sensitive benchmarking,
 * difficult branded products where higher-resolution output helps.
 *
 * @param referenceImage    Raw bytes of the product photo
 * @param referenceImageMime MIME type
 * @param identityLock      Full IdentityLock object
 * @param sceneIndices      Which EDITING_SCENES to run (0-based). Default: all 5.
 */
export async function generateByGeminiPro(
  referenceImage: Buffer,
  referenceImageMime: string,
  identityLock: IdentityLock,
  sceneIndices?: number[],
  additionalImages?: Array<{ data: Buffer; mime: string }>,
  productId?: string | number, // D-233: stable per-product background variant
  visualFacts?: string | null, // D-355N: operator-verified product facts (visual fact lock override)
): Promise<{ results: ProviderResult[]; buffers: Buffer[]; slotLogs: SlotLog[] }> {
  const scenes = sceneIndices
    ? EDITING_SCENES.filter((_, i) => sceneIndices.includes(i))
    : [...EDITING_SCENES]

  const modelId = process.env.GEMINI_IMAGE_GEN_MODEL || 'gemini-2.5-flash-image'

  const result: ProviderResult = {
    provider: `gemini-pro-image:${modelId}`,
    promptCount: scenes.length,
    successCount: 0,
    buffers: [],
    errors: [],
  }

  const slotLogs: SlotLog[] = []
  const geminiKey = process.env.GEMINI_API_KEY

  if (!geminiKey) {
    const msg = 'GEMINI_API_KEY not set — Gemini Pro generation impossible'
    console.error(`[generateByGeminiPro] ${msg}`)
    result.errors.push(msg)
    return { results: [result], buffers: [], slotLogs }
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const sharp = require('sharp') as typeof import('sharp')
    console.log(
      `[generateByGeminiPro v14] model=${modelId} input=${referenceImage.length}b ` +
      `color=${identityLock.mainColor} refAngle=${identityLock.referenceAngle || '?'} ` +
      `scenes=${scenes.map((s) => s.name).join(',')}`,
    )

    const mainColor   = identityLock.mainColor
    const refAngle    = identityLock.referenceAngle || 'unknown'
    const zoneBlock   = identityLock.protectedZoneBlock || ''
    const hasBrandZones = (identityLock.protectedZones?.length ?? 0) > 0

    // Compute scene background (target output color) — used in scene prompts
    // D-233: per-product variant so different products with the same shoe
    // color get different premium backdrops.
    const premiumBackground = getBackgroundForColor(mainColor, productId)
    const bgRGB = getBackgroundRGB(premiumBackground)

    // D-167: paddingRGB no longer used for actual padding (replaced by
    // mirror-extend below). Kept for logging/audit only.
    const paddingRGB = bgRGB // historical ref — see D-167

    console.log(
      `[generateByGeminiPro D-167] scene-bg=${JSON.stringify(bgRGB)} (prompt target) — padding: mirror-extend (no solid color)`,
    )

    // D-167: Mirror-extend padding — same as generateByEditing.
    // See D-167 comment block above for the full rationale.
    const refMetaGP = await sharp(referenceImage).metadata()
    const refWGP = refMetaGP.width ?? 768
    const refHGP = refMetaGP.height ?? 768
    const innerScaleGP = Math.min(768 / refWGP, 768 / refHGP, 1)
    const fitWGP = Math.round(refWGP * innerScaleGP)
    const fitHGP = Math.round(refHGP * innerScaleGP)

    const resizedBufGP = await sharp(referenceImage)
      .resize(fitWGP, fitHGP)
      .png()
      .toBuffer()

    const mirrorTopGP = Math.floor((768 - fitHGP) / 2)
    const mirrorBottomGP = 768 - fitHGP - mirrorTopGP
    const mirrorLeftGP = Math.floor((768 - fitWGP) / 2)
    const mirrorRightGP = 768 - fitWGP - mirrorLeftGP

    const innerBuffer = await sharp(resizedBufGP)
      .extend({
        top: mirrorTopGP, bottom: mirrorBottomGP,
        left: mirrorLeftGP, right: mirrorRightGP,
        extendWith: 'mirror',
      })
      .png()
      .toBuffer()

    const pngBuffer = await sharp(innerBuffer)
      .extend({
        top: 128, bottom: 128, left: 128, right: 128,
        extendWith: 'mirror',
      })
      .png()
      .toBuffer()

    console.log(`[generateByGeminiPro D-167] PNG 1024×1024 ready — ${pngBuffer.length}b (shoe at ${fitWGP}×${fitHGP} center, mirror-extend padding)`)
    console.log(`[lock-reminder D-153] v50 LOCKED rules prepended to every slot prompt — ${LOCK_REMINDER_BLOCK.length}b reminder block active`)

    // ── D-355H: anchor-based detail generation ──────────────────────────────
    // The material/detail slot (slot 4) is generated using the already-generated
    // front/hero (slot 2) as the PRIMARY anchor, so the close-up stays tied to the
    // EXACT same generated shoe instead of drifting independently. The sequential
    // loop runs the front/hero before the detail slot in the standard 5-slot pack.
    // If the anchor was not generated in this batch (e.g. a premium-only [3,4]
    // regen), the detail slot falls back to normal generation — no break.
    // D-412: anchor-image feeding REMOVED. D-355H/M used to feed the already-
    // generated hero/side photos back into the later slots (top/back/detail) as
    // ADDITIONAL reference images to improve material consistency — but Gemini
    // frequently rendered that second shoe INTO the scene, producing the
    // operator-reported "second/ghost shoe" in slots 4 & 5. Material consistency
    // is now carried entirely by the prompt locks (identity, material, visual-fact
    // + D-411 hardware consistency). Each slot uses only the ORIGINAL reference(s).

    // Multi-angle framing applies only when the operator supplied 2-3 real angles of the same shoe.
    const multiRefFraming = (additionalImages && additionalImages.length > 0) ? MULTI_REFERENCE_FRAMING_BLOCK : ''

    for (const scene of scenes) {
      const sceneText = scene.sceneInstructions
        .replace(/\{COLOR\}/g, mainColor)
        .replace(/\{REF_ANGLE\}/g, refAngle)
        .replace(/\{BACKGROUND\}/g, premiumBackground)

      // Same 5-block prompt structure as generateByEditing
      const isPairSlot = getSlotByKey(scene.name)?.layout === 'pair'
      const fullPrompt = LOCK_REMINDER_BLOCK + TASK_FRAMING_BLOCK + multiRefFraming + identityLock.promptBlock + zoneBlock + sceneText + STUDIO_STANDARD_BLOCK + materialDirectives(identityLock.material, identityLock.visualNotes) + MATERIAL_IDENTITY_LOCK_BLOCK + buildVisualFactLock(visualFacts) + CANONICAL_PROHIBITIONS_BLOCK + ANTI_FRAME_FINAL_BLOCK + (isPairSlot ? PAIR_MODE_FINAL_BLOCK : '')

      // D-412: every slot uses only the ORIGINAL reference image(s) (primary base +
      // any real operator-supplied extra angles of the SAME shoe). No generated
      // anchors are fed in, so Gemini can no longer composite a second shoe.
      const slotImages = additionalImages
      const slotPrompt = fullPrompt

      const slotLog: SlotLog = {
        slot: scene.name,
        label: scene.label,
        provider: `gemini-pro-image:${modelId}`,
        attempts: 0,
        success: false,
      }

      let finalBuf: Buffer | null = null

      // ── Per-slot try/catch: one slot failure must not abort remaining slots ──
      // callGeminiImageGenerate now throws on API error — catch per slot so the
      // error message is captured in slotLog.rejectionReason and surfaced to Telegram.
      try {
        // ── Attempt 1 ──────────────────────────────────────────────────────────
        slotLog.attempts = 1
        let rawBuf = await callGeminiImageGenerate(pngBuffer, slotPrompt, geminiKey, slotImages)

        const jpegBuf = await sharp(rawBuf).jpeg({ quality: 92 }).toBuffer()

        // Step D1: Color check
        const colorCheck = await checkColorMatch(jpegBuf, mainColor, geminiKey)
        slotLog.colorCheckPass = colorCheck.match
        slotLog.detectedColor  = colorCheck.detectedColor

        // Step D2: Brand fidelity check
        let brandCheck: BrandFidelityResult | null = null
        if (hasBrandZones) {
          brandCheck = await checkBrandFidelity(jpegBuf, identityLock.protectedZones!, geminiKey)
          slotLog.brandFidelityPass  = brandCheck.pass
          slotLog.brandFidelityScore = brandCheck.overallScore
          slotLog.brandFidelityNotes = brandCheck.reinforcementHint || undefined
        }

        // D-409: shot-compliance Vision check REMOVED. D-407 lets the model
        // choose composition and D-408 guarantees centering deterministically, so
        // a per-slot angle check is redundant, contradicts the loose-composition
        // rule, and was a major source of rate-limit pressure + extra regenerations.
        // Retry now fires only on real fidelity drift: colour or brand zones.
        const needsRetry = !colorCheck.match || (brandCheck !== null && !brandCheck.pass)

        if (needsRetry) {
          const correctionLines: string[] = []
          if (!colorCheck.match) {
            correctionLines.push(
              `CRITICAL COLOR CORRECTION: The previous output was ${colorCheck.detectedColor} ` +
              `but the shoe MUST be ${mainColor}. Generate a ${mainColor} shoe.`,
            )
          }
          if (brandCheck && !brandCheck.pass && brandCheck.reinforcementHint) {
            correctionLines.push(
              `CRITICAL BRAND FIDELITY CORRECTION: ${brandCheck.reinforcementHint} ` +
              `Do NOT invent fake brand text, logos, or marks.`,
            )
          }
          const reinforcedPrompt = correctionLines.join('\n') + '\n\n' + slotPrompt

          console.warn(
            `[generateByGeminiPro D-409] ✗ ${scene.name} fidelity issues — ` +
            `color=${colorCheck.match} brand=${brandCheck?.pass ?? 'skip'} — retrying`,
          )
          slotLog.attempts = 2
          await sleep(2000)

          rawBuf = await callGeminiImageGenerate(pngBuffer, reinforcedPrompt, geminiKey, slotImages)
          const retryJpeg = await sharp(rawBuf).jpeg({ quality: 92 }).toBuffer()

          const retryColor = await checkColorMatch(retryJpeg, mainColor, geminiKey)
          slotLog.colorCheckPass = retryColor.match
          slotLog.detectedColor  = retryColor.detectedColor

          if (hasBrandZones) {
            const retryBrand = await checkBrandFidelity(retryJpeg, identityLock.protectedZones!, geminiKey)
            slotLog.brandFidelityPass  = retryBrand.pass
            slotLog.brandFidelityScore = retryBrand.overallScore
            slotLog.brandFidelityNotes = retryBrand.reinforcementHint || undefined
          }

          const warnings: string[] = []
          if (!retryColor.match) warnings.push(`color drift: expected ${mainColor} got ${retryColor.detectedColor}`)
          if (slotLog.brandFidelityPass === false) warnings.push(`brand zones drifted: ${slotLog.brandFidelityNotes || 'unknown'}`)
          if (warnings.length > 0) slotLog.rejectionReason = warnings.join('; ')

          finalBuf = retryJpeg
        } else {
          finalBuf = jpegBuf
        }
      } catch (slotErr) {
        // API error or generation block — capture the real reason per slot
        const slotErrMsg = slotErr instanceof Error ? slotErr.message : String(slotErr)
        slotLog.rejectionReason = slotErrMsg
        console.warn(`[generateByGeminiPro v14] ✗ ${scene.name} failed: ${slotErrMsg}`)
        result.errors.push(`${scene.name}: ${slotErrMsg}`)
      }

      if (finalBuf) {
        // D-201 / D-407: Orientation auto-fix for the SIDE slot — toe must point
        // LEFT. This is a post-process alignment (keeps the side shot consistent
        // across the set), not a hardcoded prompt geometry.
        if (scene.name === 'side' && geminiKey) {
          try {
            const orientation = await checkShoeOrientation(finalBuf, geminiKey)
            if (orientation === 'right') {
              console.log(`[generateByGeminiPro D-201] side toe points RIGHT — flipping horizontally`)
              finalBuf = await sharp(finalBuf).flop().jpeg({ quality: 92 }).toBuffer()
              ;(slotLog as Record<string, unknown>).orientationFixed = true
            } else {
              console.log(`[generateByGeminiPro D-201] side orientation OK: ${orientation}`)
              ;(slotLog as Record<string, unknown>).orientationFixed = false
            }
          } catch (flipErr) {
            console.warn('[generateByGeminiPro D-201] orientation check failed:', flipErr)
          }
        }

        // D-412: anchor capture removed — generated images are no longer reused as
        // references for later slots (was the second-shoe cause).

        result.buffers.push(finalBuf)
        result.successCount++
        slotLog.success = true
        slotLog.outputSizeBytes = finalBuf.length
        console.log(
          `[generateByGeminiPro v20] ✓ ${scene.name} — ${finalBuf.length}b ` +
          `(attempts=${slotLog.attempts} color=${slotLog.colorCheckPass ?? 'skip'} ` +
          `brand=${slotLog.brandFidelityPass ?? 'skip'} shot=${slotLog.shotCompliancePass ?? 'skip'})`,
        )
      } else {
        const msg = `${scene.name}: null after ${slotLog.attempts} attempts`
        result.errors.push(msg)
        slotLog.rejectionReason = slotLog.rejectionReason || msg
        console.warn(`[generateByGeminiPro v20] ✗ ${msg}`)
      }

      slotLogs.push(slotLog)
      await sleep(1000)
    }
  } catch (err) {
    const msg = `Pipeline fatal: ${err instanceof Error ? err.message : err}`
    console.error(`[generateByGeminiPro v20] ${msg}`)
    result.errors.push(msg)
  }

  const slotSummary = slotLogs.map((s) => {
    if (!s.success) return '✗'
    if (s.colorCheckPass === false || s.brandFidelityPass === false || s.shotCompliancePass === false) return '⚠'
    return '✓'
  }).join('')
  console.log(`[generateByGeminiPro v20] done — ${result.successCount}/${result.promptCount} [${slotSummary}]`)

  return { results: [result], buffers: result.buffers, slotLogs }
}
