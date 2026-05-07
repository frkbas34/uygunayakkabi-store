/**
 * utmBuilder.ts — D-254 UTM Link Builder / Campaign Naming Guardrail
 *
 * Provides:
 *   - APPROVED_SOURCES / APPROVED_MEDIUMS — controlled vocabulary
 *   - normalizeCampaign() — lowercase + spaces→underscore
 *   - validateUtmInputs() — returns human-readable error strings
 *   - buildProductUtmUrl() — constructs final tagged storefront URL
 *
 * Read-only. No schema change. No mutation.
 * Consumed by the /utm Telegram command in route.ts.
 */

const STOREFRONT_BASE = 'https://www.uygunayakkabi.com'

export const APPROVED_SOURCES = new Set([
  'instagram', 'whatsapp', 'google', 'facebook', 'telegram',
  'shopier', 'website', 'referral', 'email', 'tiktok',
])

export const APPROVED_MEDIUMS = new Set([
  'social', 'bio', 'story', 'dm', 'direct', 'organic',
  'cpc', 'manual', 'email', 'reel',
])

/** Minimum 2 chars, maximum 50. Lowercase letters, digits, underscores only. */
export const CAMPAIGN_PATTERN = /^[a-z0-9][a-z0-9_]{0,48}[a-z0-9]$|^[a-z0-9]{1,2}$/

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/**
 * Normalize a raw campaign string:
 *   - trim whitespace
 *   - lowercase
 *   - collapse internal spaces → underscore
 * Caller must still run validateUtmInputs() after normalizing.
 */
export function normalizeCampaign(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, '_')
}

/**
 * Validate already-normalized source, medium, campaign.
 * Returns an array of human-readable Telegram HTML error lines.
 * Empty array = all valid.
 */
export function validateUtmInputs(source: string, medium: string, campaign: string): string[] {
  const errors: string[] = []

  if (!APPROVED_SOURCES.has(source)) {
    errors.push(
      `❌ Geçersiz <b>source</b>: <code>${escHtml(source)}</code>\n` +
      `Geçerliler: ${[...APPROVED_SOURCES].sort().join(', ')}`,
    )
  }

  if (!APPROVED_MEDIUMS.has(medium)) {
    errors.push(
      `❌ Geçersiz <b>medium</b>: <code>${escHtml(medium)}</code>\n` +
      `Geçerliler: ${[...APPROVED_MEDIUMS].sort().join(', ')}`,
    )
  }

  if (!CAMPAIGN_PATTERN.test(campaign)) {
    errors.push(
      `❌ Geçersiz <b>campaign</b>: <code>${escHtml(campaign)}</code>\n` +
      `Kural: küçük harf, rakam, alt çizgi (_) — 2–50 karakter, baş/son alt çizgi yok\n` +
      `Örnek: <code>story_drop_01</code> · <code>bio_test_01</code> · <code>summer_launch_02</code>`,
    )
  }

  return errors
}

/** Build the final tagged storefront product URL. Inputs must already be validated. */
export function buildProductUtmUrl(
  slug: string,
  source: string,
  medium: string,
  campaign: string,
): string {
  return (
    `${STOREFRONT_BASE}/products/${slug}` +
    `?utm_source=${encodeURIComponent(source)}` +
    `&utm_medium=${encodeURIComponent(medium)}` +
    `&utm_campaign=${encodeURIComponent(campaign)}`
  )
}

/** Usage string shown when /utm is called with wrong arg count. */
export const UTM_USAGE = `\
🔗 <b>UTM Link Oluşturucu</b>

Kullanım:
<code>/utm SN0034 instagram social story_drop_01</code>
<code>/utm 34 google organic seo_campaign_01</code>

<b>Onaylı source değerleri:</b>
${[...APPROVED_SOURCES].sort().join(', ')}

<b>Onaylı medium değerleri:</b>
${[...APPROVED_MEDIUMS].sort().join(', ')}

<b>Campaign kuralı:</b>
Küçük harf + rakam + alt çizgi (_), 2–50 karakter
Örnek: <code>summer_drop_01</code> · <code>bio_test_01</code>`
