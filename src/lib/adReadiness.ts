/**
 * adReadiness.ts — D-348 Manual Ads Launch Pack
 *
 * A read-only, operator-controlled "is this product ready to advertise?" checklist.
 * It composes existing safety/readiness helpers — it adds NO new detection logic,
 * makes NO external calls, and never publishes or spends. The output is a checklist
 * the operator reads before manually launching an ad; nothing here triggers ads.
 *
 * Reused helpers (single source of truth — no duplicated rules):
 *   - scanProductBrandSafety  → brand block + risky-claim warning (brandSafety.ts)
 *   - summarizeProductStock   → stock + size/variant clarity     (productStock.ts)
 *   - countUsableMediaRows    → clean, public AI media           (productMedia.ts)
 *   - resolveConfiguredTargets→ configured active channels       (productActivationGuard.ts)
 *   - buildProductUtmUrl      → sample UTM-tagged landing link    (utmBuilder.ts)
 *
 * Pure module — never throws on odd product shapes (fail-soft to a blocked result).
 */
import { scanProductBrandSafety } from './brandSafety'
import { summarizeProductStock } from './productStock'
import { countUsableMediaRows } from './productMedia'
import { resolveConfiguredTargets } from './productActivationGuard'
import { buildProductUtmUrl } from './utmBuilder'
import { evaluateImageQualityGate } from './imageQualityGate'

export type AdReadinessLevel = 'ready' | 'review' | 'blocked'

export interface AdReadinessCheck {
  key:
    | 'product_page'
    | 'media_clean'
    | 'stock_size'
    | 'channel_link'
    | 'utm_ready'
    | 'lead_visibility'
    | 'brand_safety'
    | 'risky_claims'
    | 'no_autonomous_spend'
  label: string
  /** true = passes. false + warn=true = soft warning. false + no warn = hard blocker. */
  ok: boolean
  warn?: boolean
  detail: string
}

export interface AdReadinessResult {
  level: AdReadinessLevel
  checks: AdReadinessCheck[]
  /** Hard blockers (ok=false, warn!=true) — must fix before advertising. */
  blockers: string[]
  /** Soft warnings (warn=true) — operator should review, not auto-blocking. */
  warnings: string[]
  passedCount: number
  totalCount: number
  /** Example UTM-tagged storefront link (only when a slug exists). Operator-controlled. */
  sampleUtmUrl: string | null
  summary: string
}

type AdProduct = Record<string, any> | null | undefined

/**
 * Evaluate ad-readiness across the manual launch checklist. Read-only, never throws.
 */
export function evaluateAdReadiness(product: AdProduct): AdReadinessResult {
  try {
    const p = (product ?? {}) as Record<string, any>
    const status = typeof p.status === 'string' ? p.status : 'draft'
    const slug = typeof p.slug === 'string' && p.slug.trim().length > 0 ? p.slug.trim() : null

    const aiMedia = countUsableMediaRows(p.generativeGallery)
    const originalMedia = countUsableMediaRows(p.images)
    const imageQuality = evaluateImageQualityGate(p)
    const stock = summarizeProductStock(p as any)
    const targets = resolveConfiguredTargets(p as any)
    const brand = scanProductBrandSafety(p)

    const checks: AdReadinessCheck[] = []

    // 1. Product page readiness — ad must point at a live, indexable page.
    checks.push(
      status === 'active' && slug
        ? { key: 'product_page', label: 'Ürün sayfası yayında', ok: true, detail: `status=active · /products/${slug}` }
        : {
            key: 'product_page',
            label: 'Ürün sayfası yayında',
            ok: false,
            detail: status !== 'active'
              ? `Ürün aktif değil (status=${status}) — reklam taslak/gizli sayfaya gider`
              : 'Slug yok — ürün linki üretilemez',
          },
    )

    // 2. Clean media — only AI/generative images are public + ad-safe. Originals never go public.
    if (aiMedia > 0 && imageQuality.publishable) {
      checks.push({ key: 'media_clean', label: 'Temiz görsel (AI galeri)', ok: true, detail: `${aiMedia} AI görsel` })
    } else if (aiMedia > 0) {
      checks.push({
        key: 'media_clean',
        label: 'Temiz gorsel (AI galeri)',
        ok: false,
        detail: `AI gorsel QC PASS degil: ${imageQuality.detail}`,
      })
    } else if (originalMedia > 0) {
      checks.push({
        key: 'media_clean',
        label: 'Temiz görsel (AI galeri)',
        ok: false,
        warn: true,
        detail: 'Yalnızca orijinal tedarik görseli var — reklam için AI görsel üretin',
      })
    } else {
      checks.push({ key: 'media_clean', label: 'Temiz görsel (AI galeri)', ok: false, detail: 'Hiç kullanılabilir görsel yok' })
    }

    // 3. Stock + size clarity.
    if (!stock.hasSellableStock) {
      checks.push({ key: 'stock_size', label: 'Stok & beden netliği', ok: false, detail: `Satılabilir stok yok (${stock.detail})` })
    } else if (!stock.hasVariantStockDetails) {
      checks.push({
        key: 'stock_size',
        label: 'Stok & beden netliği',
        ok: false,
        warn: true,
        detail: `Stok var ama beden varyantı yok (${stock.effectiveStock} adet, tek stok)`,
      })
    } else {
      checks.push({ key: 'stock_size', label: 'Stok & beden netliği', ok: true, detail: `${stock.effectiveStock} adet · beden varyantları tanımlı` })
    }

    // 4. Working channel link — at least one configured channel + a resolvable product URL.
    checks.push(
      slug && targets.length > 0
        ? { key: 'channel_link', label: 'Çalışan kanal/ürün linki', ok: true, detail: `hedefler: ${targets.join(', ')}` }
        : {
            key: 'channel_link',
            label: 'Çalışan kanal/ürün linki',
            ok: false,
            detail: !slug ? 'Slug yok — link üretilemez' : 'Yapılandırılmış aktif kanal hedefi yok',
          },
    )

    // 5. UTM readiness — a slug means a tagged landing link can be built via /utm.
    checks.push(
      slug
        ? { key: 'utm_ready', label: 'UTM hazır', ok: true, detail: '/utm ile etiketli link üretilebilir' }
        : { key: 'utm_ready', label: 'UTM hazır', ok: false, detail: 'Slug yok — UTM linki üretilemez' },
    )

    // 6. Lead visibility — an active product page renders the lead form + WhatsApp CTA.
    checks.push(
      status === 'active'
        ? { key: 'lead_visibility', label: 'Lead formu görünür', ok: true, detail: 'Aktif ürün sayfası talep formunu gösterir' }
        : { key: 'lead_visibility', label: 'Lead formu görünür', ok: false, detail: 'Ürün aktif değil — lead formu görünmez' },
    )

    // 7. Brand safety — never advertise a protected-brand-infringing product (hard block).
    checks.push(
      brand.safe
        ? { key: 'brand_safety', label: 'Marka güvenliği', ok: true, detail: 'Korumalı marka adı yok' }
        : { key: 'brand_safety', label: 'Marka güvenliği', ok: false, detail: `Korumalı marka: ${brand.blockedBrands.join(', ')} (alanlar: ${brand.matchedFields.join(', ')})` },
    )

    // 8. No risky claims — claim terms without a brand are a warning, not a block (operator reviews).
    checks.push(
      brand.riskyClaims.length === 0
        ? { key: 'risky_claims', label: 'Riskli iddia yok', ok: true, detail: 'Orijinallik/model iddiası yok' }
        : { key: 'risky_claims', label: 'Riskli iddia yok', ok: false, warn: true, detail: `Gözden geçirin — iddia terimleri: ${brand.riskyClaims.join(', ')}` },
    )

    // 9. No autonomous ad spend — standing guardrail reminder (always passes).
    checks.push({
      key: 'no_autonomous_spend',
      label: 'Otomatik reklam harcaması yok',
      ok: true,
      detail: 'Bütçe, hedefleme ve yayın tamamen operatör kontrolünde — sistem otomatik harcama yapmaz',
    })

    const blockers = checks.filter((c) => !c.ok && !c.warn).map((c) => `${c.label}: ${c.detail}`)
    const warnings = checks.filter((c) => c.warn === true).map((c) => `${c.label}: ${c.detail}`)
    const passedCount = checks.filter((c) => c.ok).length

    const level: AdReadinessLevel =
      blockers.length > 0 ? 'blocked' : warnings.length > 0 ? 'review' : 'ready'

    const sampleUtmUrl = slug ? buildProductUtmUrl(slug, 'instagram', 'social', 'manual_ads') : null

    const summary =
      level === 'ready'
        ? '✅ Reklam için hazır — tüm kontroller geçti'
        : level === 'review'
          ? `🟡 Gözden geçir — ${warnings.length} uyarı, ${blockers.length} engel`
          : `🔴 Reklam verilemez — ${blockers.length} engel`

    return { level, checks, blockers, warnings, passedCount, totalCount: checks.length, sampleUtmUrl, summary }
  } catch {
    // Fail-soft: never break an operator surface on an unexpected product shape.
    return {
      level: 'blocked',
      checks: [],
      blockers: ['ad-readiness değerlendirilemedi (beklenmeyen ürün şekli)'],
      warnings: [],
      passedCount: 0,
      totalCount: 0,
      sampleUtmUrl: null,
      summary: '🔴 Reklam hazırlığı değerlendirilemedi',
    }
  }
}

const LEVEL_EMOJI: Record<AdReadinessLevel, string> = {
  ready: '🟢',
  review: '🟡',
  blocked: '🔴',
}

const LEVEL_LABEL: Record<AdReadinessLevel, string> = {
  ready: 'REKLAMA HAZIR',
  review: 'GÖZDEN GEÇİR',
  blocked: 'REKLAM VERİLEMEZ',
}

/**
 * Format the ad-readiness checklist as a compact Telegram HTML message.
 * Output is informational only — it never publishes or spends.
 */
export function formatAdReadinessMessage(product: AdProduct, result: AdReadinessResult): string {
  const p = (product ?? {}) as Record<string, any>
  const lines: string[] = [
    `<b>📣 Reklam Hazırlığı — #${p.id ?? '?'}</b>`,
    `<b>${p.title ?? 'Untitled'}</b>`,
    '',
    `${LEVEL_EMOJI[result.level]} <b>${LEVEL_LABEL[result.level]}</b> (${result.passedCount}/${result.totalCount})`,
    '',
  ]

  for (const c of result.checks) {
    const icon = c.ok ? '✅' : c.warn ? '⚠️' : '❌'
    lines.push(`${icon} <b>${c.label}</b>: ${c.detail}`)
  }

  if (result.sampleUtmUrl) {
    lines.push('', `🔗 Örnek UTM linki: <code>${result.sampleUtmUrl}</code>`)
  }

  lines.push('', '<i>Bu bir kontrol listesidir — hiçbir reklam yayınlanmaz veya harcama yapılmaz. Yayını siz başlatırsınız.</i>')
  return lines.join('\n')
}
