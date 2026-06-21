/**
 * brandSafety.ts — D-336A/D-336B
 *
 * Detects protected brand names and risky authenticity/originality/model claims
 * in product text, BEFORE a product becomes publish-ready (Layer 1: Mentix audit)
 * or is dispatched to external channels (Layer 2: channelDispatch).
 *
 * Pure module — NO project/Payload imports, never throws. Safe to call from the
 * audit, the dispatcher, and unit checks.
 *
 * Policy (matches D-336 plan):
 *   - A protected BRAND name alone => BLOCK (safe=false). Brand is the hard signal.
 *   - Risky CLAIM terms alone (e.g. "model", "logo", "original") => DO NOT block
 *     clean products; they only raise a warning. This avoids false positives on
 *     common generic words.
 *   - Brand + authenticity/model/logo claim => escalate severity to critical.
 *   - Counterfeit-admission claims alone (replica / replika / 1:1) => high-severity
 *     warning (still not a hard block, per spec — operator decides).
 */

export type BrandSafetySeverity = 'low' | 'medium' | 'high' | 'critical'

export interface BrandSafetyResult {
  /** false ONLY when a protected brand name is present (the hard block signal). */
  safe: boolean
  severity: BrandSafetySeverity
  /** Canonical display names of protected brands found. */
  blockedBrands: string[]
  /** Risky claim/authenticity/model terms found. */
  riskyClaims: string[]
  /** Field names where any brand/claim term matched. */
  matchedFields: string[]
  /** Human-readable, non-secret reasons for the result. */
  reasons: string[]
}

/** A single named text field to scan. */
export interface ScanField {
  field: string
  text: string
}

// ── Term lists ────────────────────────────────────────────────────────────────

/** Protected brand names (extensible). Multi-word entries matched as phrases. */
export const BLOCKED_BRANDS: string[] = [
  'Louis Vuitton', 'LV', 'BOSS', 'Hugo Boss', 'New Balance', 'Nike', 'Adidas',
  'Puma', 'Jordan', 'Gucci', 'Prada', 'Dior', 'Chanel', 'Balenciaga', 'Versace',
  'Fendi', 'Armani', 'Lacoste', 'Tommy Hilfiger', 'Calvin Klein', 'Vans', 'Converse',
]

/** Risky claim/authenticity/model terms (warning signal; escalate when with a brand). */
export const RISKY_CLAIM_TERMS: string[] = [
  'orijinal', 'özgün', 'özgünlük', 'gerçek', 'genuine', 'authentic', 'original',
  'official', 'logo', 'model', '9060', '1:1', 'replika', 'replica',
]

/** Explicit counterfeit-admission terms — high-severity even without a brand. */
const COUNTERFEIT_CLAIM_TERMS = ['replica', 'replika', '1:1']

/** Authenticity/model/logo terms that escalate to CRITICAL when a brand is present. */
const ESCALATION_CLAIM_TERMS = [
  'orijinal', 'ozgun', 'ozgunluk', 'gercek', 'genuine', 'authentic', 'original',
  'official', 'logo', 'model', '9060', '1:1', 'replica', 'replika',
]

// ── Normalization ───────────────────────────────────────────────────────────

/**
 * Normalize text for matching: Turkish-aware lowercasing + diacritic folding +
 * whitespace collapse. After this, the alphabet is plain [a-z0-9] + spaces/punct.
 */
export function normalizeForMatch(input: string): string {
  if (!input) return ''
  return String(input)
    .replace(/İ/g, 'i')
    .replace(/I/g, 'i')
    .replace(/ı/g, 'i')
    .replace(/Ş/g, 's').replace(/ş/g, 's')
    .replace(/Ç/g, 'c').replace(/ç/g, 'c')
    .replace(/Ğ/g, 'g').replace(/ğ/g, 'g')
    .replace(/Ö/g, 'o').replace(/ö/g, 'o')
    .replace(/Ü/g, 'u').replace(/ü/g, 'u')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Whole-token match on already-normalized text. Boundary = not adjacent to a
 * letter or digit (handles ':' in "1:1" and multi-word brands correctly).
 */
function tokenPresent(normText: string, normTerm: string): boolean {
  if (!normTerm) return false
  const re = new RegExp('(^|[^a-z0-9])' + escapeRegExp(normTerm) + '([^a-z0-9]|$)')
  return re.test(normText)
}

/**
 * Stem match: a token that STARTS with the stem (Turkish is agglutinative, so
 * "özgün" → "özgünlük/özgünlüğü/özgünlüğünü"). Used only for a small allowlist of
 * distinctive authenticity stems where inflection is common and false positives
 * are negligible.
 */
function tokenStartsWith(normText: string, normStem: string): boolean {
  if (!normStem) return false
  const re = new RegExp('(^|[^a-z0-9])' + escapeRegExp(normStem) + '[a-z0-9]*([^a-z0-9]|$)')
  return re.test(normText)
}

/** Distinctive authenticity stems matched as prefixes to catch Turkish inflection. */
const STEMMABLE_CLAIM_STEMS = ['ozgun', 'orijinal']

// ── Core scan ───────────────────────────────────────────────────────────────

/**
 * Scan a set of named text fields for protected brands + risky claims.
 * Never throws.
 */
export function scanBrandSafety(fields: ScanField[]): BrandSafetyResult {
  const blockedBrandsSet = new Set<string>()
  const riskyClaimsSet = new Set<string>()
  const matchedFieldsSet = new Set<string>()

  const normBrands = BLOCKED_BRANDS.map((b) => ({ display: b, norm: normalizeForMatch(b) }))
  const normClaims = RISKY_CLAIM_TERMS.map((c) => ({ display: c, norm: normalizeForMatch(c) }))

  for (const f of fields || []) {
    if (!f || !f.text) continue
    const norm = normalizeForMatch(f.text)
    if (!norm) continue
    let fieldMatched = false

    for (const b of normBrands) {
      if (tokenPresent(norm, b.norm)) {
        blockedBrandsSet.add(b.display)
        fieldMatched = true
      }
    }
    for (const c of normClaims) {
      const matched = STEMMABLE_CLAIM_STEMS.includes(c.norm)
        ? tokenStartsWith(norm, c.norm)
        : tokenPresent(norm, c.norm)
      if (matched) {
        riskyClaimsSet.add(c.display)
        fieldMatched = true
      }
    }
    if (fieldMatched) matchedFieldsSet.add(f.field)
  }

  const blockedBrands = [...blockedBrandsSet]
  const riskyClaims = [...riskyClaimsSet]
  const matchedFields = [...matchedFieldsSet]
  const reasons: string[] = []

  const normalizedClaims = riskyClaims.map((c) => normalizeForMatch(c))
  const hasEscalationClaim = normalizedClaims.some((c) => ESCALATION_CLAIM_TERMS.includes(c))
  const hasCounterfeitClaim = riskyClaims
    .map((c) => c.toLowerCase())
    .some((c) => COUNTERFEIT_CLAIM_TERMS.includes(c))

  let safe: boolean
  let severity: BrandSafetySeverity

  if (blockedBrands.length > 0) {
    safe = false
    severity = hasEscalationClaim ? 'critical' : 'high'
    reasons.push(`Protected brand detected: ${blockedBrands.join(', ')}`)
    if (hasEscalationClaim) {
      reasons.push(`Authenticity/logo/model claim co-occurs with brand: ${riskyClaims.join(', ')}`)
    }
    reasons.push(`Matched fields: ${matchedFields.join(', ')}`)
  } else if (riskyClaims.length > 0) {
    // Claim terms only — DO NOT block clean products (per D-336 policy).
    safe = true
    severity = hasCounterfeitClaim ? 'high' : 'medium'
    reasons.push(`Risky claim term(s) present without a brand (warning only): ${riskyClaims.join(', ')}`)
  } else {
    safe = true
    severity = 'low'
  }

  return { safe, severity, blockedBrands, riskyClaims, matchedFields, reasons }
}

// ── Product helpers ───────────────────────────────────────────────────────────

type AnyProduct = Record<string, any> | null | undefined

/**
 * Collect all relevant text fields from a product document into ScanField[].
 * Defensive against missing/renamed fields (reads both facebookCopy/facebookPost,
 * keywordEntities/keywords).
 */
export function collectProductTexts(product: AnyProduct): ScanField[] {
  const fields: ScanField[] = []
  if (!product) return fields
  const push = (field: string, val: unknown) => {
    if (typeof val === 'string' && val.trim().length > 0) fields.push({ field, text: val })
  }
  const pushArr = (field: string, arr: unknown) => {
    if (Array.isArray(arr)) {
      const joined = arr
        .map((x) => (typeof x === 'string' ? x : x && typeof x === 'object' ? Object.values(x).filter((v) => typeof v === 'string').join(' ') : ''))
        .filter(Boolean)
        .join(' — ')
      push(field, joined)
    }
  }

  push('title', product.title)
  push('slug', product.slug)
  push('brand', product.brand)
  push('description', product.description)

  const cp = product.content?.commercePack ?? {}
  push('commercePack.websiteDescription', cp.websiteDescription)
  pushArr('commercePack.highlights', cp.highlights)
  push('commercePack.instagramCaption', cp.instagramCaption)
  push('commercePack.xPost', cp.xPost)
  push('commercePack.facebookCopy', cp.facebookCopy ?? cp.facebookPost)
  push('commercePack.shopierCopy', cp.shopierCopy)

  const dp = product.content?.discoveryPack ?? {}
  push('discoveryPack.articleTitle', dp.articleTitle)
  push('discoveryPack.articleBody', dp.articleBody)
  push('discoveryPack.metaTitle', dp.metaTitle)
  push('discoveryPack.metaDescription', dp.metaDescription)
  pushArr('discoveryPack.keywordEntities', dp.keywordEntities ?? dp.keywords)
  if (Array.isArray(dp.faq)) {
    const faqText = dp.faq
      .map((f: any) => `${f?.q ?? ''} ${f?.a ?? ''}`)
      .join(' — ')
    push('discoveryPack.faq', faqText)
  }

  return fields
}

/** Convenience: scan a full product document. Never throws. */
export function scanProductBrandSafety(product: AnyProduct): BrandSafetyResult {
  try {
    return scanBrandSafety(collectProductTexts(product))
  } catch {
    // Fail-open on unexpected shape — never break the pipeline; treat as safe=low.
    return { safe: true, severity: 'low', blockedBrands: [], riskyClaims: [], matchedFields: [], reasons: [] }
  }
}

/** Compact one-line summary for Telegram/audit messages. */
export function formatBrandSafetyReason(result: BrandSafetyResult): string {
  if (result.safe && result.severity === 'low') return ''
  const parts: string[] = []
  if (result.blockedBrands.length > 0) parts.push(`marka: ${result.blockedBrands.join(', ')}`)
  if (result.riskyClaims.length > 0) parts.push(`iddia: ${result.riskyClaims.join(', ')}`)
  if (result.matchedFields.length > 0) parts.push(`alanlar: ${result.matchedFields.join(', ')}`)
  return parts.join(' | ')
}
