import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  resolveProductStatus,
  resolveChannelTargets,
  resolveContentDecision,
  fetchAutomationSettings,
  type AutomationSettingsSnapshot,
  type StatusDecisionInput,
} from '../lib/automationDecision'
import type { PublishReadinessResult } from '../lib/telegram'

// ─── Fixtures ───────────────────────────────────────────────────────────────

const READY: PublishReadinessResult = {
  isReady: true,
  missingCritical: [],
  warnings: [],
  score: 100,
}

const NOT_READY: PublishReadinessResult = {
  isReady: false,
  missingCritical: ['Ürün adı', 'Satış fiyatı'],
  warnings: [],
  score: 71,
}

/** Settings that allow immediate activation when confidence is ≥60 */
const PERMISSIVE_SETTINGS: AutomationSettingsSnapshot = {
  productIntake: {
    requireAdminReview: false,
    autoActivateProducts: true,
    minConfidenceToActivate: 60,
  },
  channelPublishing: {
    publishWebsite: true,
    publishInstagram: true,
    publishShopier: true,
    publishDolap: false,
    publishX: false,
    publishFacebook: false,
    publishLinkedin: false,
    publishThreads: false,
  },
  contentGeneration: {
    autoGenerateBlog: true,
    autoPublishBlog: false,
    autoGenerateExtraViews: false,
    enableTryOn: false,
  },
}

/** Conservative settings — admin review required */
const CONSERVATIVE_SETTINGS: AutomationSettingsSnapshot = {
  productIntake: {
    requireAdminReview: true,
    autoActivateProducts: false,
    minConfidenceToActivate: 80,
  },
}

// ─── resolveProductStatus ────────────────────────────────────────────────────

describe('resolveProductStatus', () => {
  it('returns draft when explicitStatus is "draft"', () => {
    const input: StatusDecisionInput = {
      explicitStatus: 'draft',
      readiness: READY,
      parseConfidence: 100,
    }
    const result = resolveProductStatus(input, PERMISSIVE_SETTINGS)
    expect(result.status).toBe('draft')
    expect(result.blockedBy).toBe('explicit_draft')
  })

  it('returns draft when settings are null (safe fallback)', () => {
    const input: StatusDecisionInput = { readiness: READY, parseConfidence: 90 }
    const result = resolveProductStatus(input, null)
    expect(result.status).toBe('draft')
    expect(result.blockedBy).toBe('settings_unavailable')
  })

  it('returns draft when settings are undefined (safe fallback)', () => {
    const input: StatusDecisionInput = { readiness: READY, parseConfidence: 90 }
    const result = resolveProductStatus(input, undefined)
    expect(result.status).toBe('draft')
    expect(result.blockedBy).toBe('settings_unavailable')
  })

  it('returns draft when requireAdminReview is true', () => {
    const input: StatusDecisionInput = { readiness: READY, parseConfidence: 95 }
    const result = resolveProductStatus(input, CONSERVATIVE_SETTINGS)
    expect(result.status).toBe('draft')
    expect(result.blockedBy).toBe('require_admin_review')
  })

  it('returns draft when autoActivateProducts is false and no product override', () => {
    const settings: AutomationSettingsSnapshot = {
      productIntake: { requireAdminReview: false, autoActivateProducts: false },
    }
    const input: StatusDecisionInput = { readiness: READY, parseConfidence: 90 }
    const result = resolveProductStatus(input, settings)
    expect(result.status).toBe('draft')
    expect(result.blockedBy).toBe('auto_activate_off')
  })

  it('allows product-level override to activate when global autoActivate is false', () => {
    const settings: AutomationSettingsSnapshot = {
      productIntake: {
        requireAdminReview: false,
        autoActivateProducts: false,
        minConfidenceToActivate: 60,
      },
    }
    const input: StatusDecisionInput = {
      readiness: READY,
      parseConfidence: 90,
      productAutoActivateOverride: true,
    }
    const result = resolveProductStatus(input, settings)
    expect(result.status).toBe('active')
  })

  it('product-level override cannot bypass requireAdminReview', () => {
    const settings: AutomationSettingsSnapshot = {
      productIntake: {
        requireAdminReview: true,
        autoActivateProducts: false,
        minConfidenceToActivate: 60,
      },
    }
    const input: StatusDecisionInput = {
      readiness: READY,
      parseConfidence: 90,
      productAutoActivateOverride: true,
    }
    const result = resolveProductStatus(input, settings)
    expect(result.status).toBe('draft')
    expect(result.blockedBy).toBe('require_admin_review')
  })

  it('returns draft when confidence is below threshold', () => {
    const settings: AutomationSettingsSnapshot = {
      productIntake: {
        requireAdminReview: false,
        autoActivateProducts: true,
        minConfidenceToActivate: 70,
      },
    }
    const input: StatusDecisionInput = { readiness: READY, parseConfidence: 55 }
    const result = resolveProductStatus(input, settings)
    expect(result.status).toBe('draft')
    expect(result.blockedBy).toBe('confidence_below_threshold')
    expect(result.reason).toContain('55%')
    expect(result.reason).toContain('70%')
  })

  it('treats absent parseConfidence as 0', () => {
    const input: StatusDecisionInput = { readiness: READY }
    const result = resolveProductStatus(input, PERMISSIVE_SETTINGS)
    expect(result.status).toBe('draft')
    expect(result.blockedBy).toBe('confidence_below_threshold')
  })

  it('returns draft when readiness gate fails', () => {
    const input: StatusDecisionInput = { readiness: NOT_READY, parseConfidence: 90 }
    const result = resolveProductStatus(input, PERMISSIVE_SETTINGS)
    expect(result.status).toBe('draft')
    expect(result.blockedBy).toBe('readiness_failed')
    expect(result.reason).toContain('Ürün adı')
  })

  it('returns active when all gates pass', () => {
    const input: StatusDecisionInput = { readiness: READY, parseConfidence: 80 }
    const result = resolveProductStatus(input, PERMISSIVE_SETTINGS)
    expect(result.status).toBe('active')
    expect(result.blockedBy).toBeUndefined()
    expect(result.reason).toContain('80%')
  })

  it('activates at exactly the confidence threshold', () => {
    const settings: AutomationSettingsSnapshot = {
      productIntake: {
        requireAdminReview: false,
        autoActivateProducts: true,
        minConfidenceToActivate: 60,
      },
    }
    const input: StatusDecisionInput = { readiness: READY, parseConfidence: 60 }
    const result = resolveProductStatus(input, settings)
    expect(result.status).toBe('active')
  })

  it('blocks at one below the confidence threshold', () => {
    const settings: AutomationSettingsSnapshot = {
      productIntake: {
        requireAdminReview: false,
        autoActivateProducts: true,
        minConfidenceToActivate: 60,
      },
    }
    const input: StatusDecisionInput = { readiness: READY, parseConfidence: 59 }
    const result = resolveProductStatus(input, settings)
    expect(result.status).toBe('draft')
    expect(result.blockedBy).toBe('confidence_below_threshold')
  })

  it('uses SAFE_DEFAULTS when productIntake is absent from settings', () => {
    // SAFE_DEFAULTS: requireAdminReview=true → always draft
    const result = resolveProductStatus(
      { readiness: READY, parseConfidence: 90 },
      {},
    )
    expect(result.status).toBe('draft')
    expect(result.blockedBy).toBe('require_admin_review')
  })
})

// ─── resolveChannelTargets ───────────────────────────────────────────────────

describe('resolveChannelTargets', () => {
  it('returns only globally-enabled channels that are also product targets', () => {
    const result = resolveChannelTargets(
      ['website', 'instagram', 'shopier', 'dolap'],
      PERMISSIVE_SETTINGS,
    )
    expect(result.effectiveTargets).toEqual(['website', 'instagram', 'shopier'])
    expect(result.blockedByGlobal).toContain('dolap')
  })

  it('defaults to ["website"] when productTargets is null', () => {
    const result = resolveChannelTargets(null, PERMISSIVE_SETTINGS)
    expect(result.effectiveTargets).toContain('website')
  })

  it('defaults to ["website"] when productTargets is undefined', () => {
    const result = resolveChannelTargets(undefined, PERMISSIVE_SETTINGS)
    expect(result.effectiveTargets).toContain('website')
  })

  it('blocks all social channels when settings are null (safe defaults)', () => {
    // SAFE_DEFAULTS: only publishWebsite=true
    const result = resolveChannelTargets(
      ['website', 'instagram', 'shopier'],
      null,
    )
    expect(result.effectiveTargets).toEqual(['website'])
    expect(result.blockedByGlobal).toContain('instagram')
    expect(result.blockedByGlobal).toContain('shopier')
  })

  it('silently drops unknown channels', () => {
    const result = resolveChannelTargets(['website', 'unknownchannel'], PERMISSIVE_SETTINGS)
    expect(result.effectiveTargets).toEqual(['website'])
    expect(result.blockedByGlobal).not.toContain('unknownchannel')
  })

  it('is case-insensitive for channel names', () => {
    const result = resolveChannelTargets(['WEBSITE', 'Instagram'], PERMISSIVE_SETTINGS)
    expect(result.effectiveTargets).toContain('website')
    expect(result.effectiveTargets).toContain('instagram')
  })

  it('returns empty effectiveTargets when all channels are globally disabled', () => {
    const noChannels: AutomationSettingsSnapshot = {
      channelPublishing: {
        publishWebsite: false,
        publishInstagram: false,
        publishShopier: false,
      },
    }
    const result = resolveChannelTargets(['website', 'instagram', 'shopier'], noChannels)
    expect(result.effectiveTargets).toHaveLength(0)
    expect(result.blockedByGlobal).toHaveLength(3)
  })

  it('summary mentions "Hiçbir kanal aktif değil" when no effective targets', () => {
    const noChannels: AutomationSettingsSnapshot = {
      channelPublishing: { publishWebsite: false },
    }
    const result = resolveChannelTargets(['website'], noChannels)
    expect(result.summary).toContain('Hiçbir kanal aktif değil')
  })

  it('summary lists effective channels when present', () => {
    const result = resolveChannelTargets(['website'], PERMISSIVE_SETTINGS)
    expect(result.summary).toContain('website')
    expect(result.summary).toContain('aktif')
  })

  it('summary mentions blocked channels', () => {
    const result = resolveChannelTargets(
      ['website', 'instagram', 'x'],
      PERMISSIVE_SETTINGS,
    )
    expect(result.summary).toContain('x')
    expect(result.summary).toContain('global ayarda kapalı')
  })
})

// ─── resolveContentDecision ──────────────────────────────────────────────────

describe('resolveContentDecision', () => {
  it('returns all false when settings are null (safe defaults)', () => {
    const result = resolveContentDecision(
      { generateBlog: true, generateExtraViews: true, enableTryOn: true },
      true,
      null,
    )
    expect(result.shouldGenerateBlog).toBe(false)
    expect(result.shouldAutoPublishBlog).toBe(false)
    expect(result.shouldGenerateExtraViews).toBe(false)
    expect(result.tryOnEnabled).toBe(false)
  })

  it('generates blog when global on AND product flag on', () => {
    const settings: AutomationSettingsSnapshot = {
      contentGeneration: {
        autoGenerateBlog: true,
        autoPublishBlog: false,
        autoGenerateExtraViews: false,
        enableTryOn: false,
      },
    }
    const result = resolveContentDecision({ generateBlog: true }, false, settings)
    expect(result.shouldGenerateBlog).toBe(true)
  })

  it('generates blog when global on AND seoRequested even without product flag', () => {
    const settings: AutomationSettingsSnapshot = {
      contentGeneration: { autoGenerateBlog: true },
    }
    const result = resolveContentDecision({ generateBlog: false }, true, settings)
    expect(result.shouldGenerateBlog).toBe(true)
  })

  it('does NOT generate blog when global is off even if product flag and seo are on', () => {
    const settings: AutomationSettingsSnapshot = {
      contentGeneration: { autoGenerateBlog: false },
    }
    const result = resolveContentDecision({ generateBlog: true }, true, settings)
    expect(result.shouldGenerateBlog).toBe(false)
  })

  it('enables extra views only when both global and product flags are on', () => {
    const settings: AutomationSettingsSnapshot = {
      contentGeneration: { autoGenerateExtraViews: true },
    }
    expect(
      resolveContentDecision({ generateExtraViews: true }, false, settings)
        .shouldGenerateExtraViews,
    ).toBe(true)
    expect(
      resolveContentDecision({ generateExtraViews: false }, false, settings)
        .shouldGenerateExtraViews,
    ).toBe(false)
  })

  it('enables try-on only when both global and product flags are on', () => {
    const settings: AutomationSettingsSnapshot = {
      contentGeneration: { enableTryOn: true },
    }
    expect(
      resolveContentDecision({ enableTryOn: true }, false, settings).tryOnEnabled,
    ).toBe(true)
    expect(
      resolveContentDecision({ enableTryOn: false }, false, settings).tryOnEnabled,
    ).toBe(false)
  })

  it('handles null productFlags gracefully', () => {
    const settings: AutomationSettingsSnapshot = {
      contentGeneration: {
        autoGenerateBlog: true,
        autoPublishBlog: true,
        autoGenerateExtraViews: true,
        enableTryOn: true,
      },
    }
    const result = resolveContentDecision(null, false, settings)
    expect(result.shouldGenerateBlog).toBe(false) // no seo, no product flag
    expect(result.shouldAutoPublishBlog).toBe(true)
    expect(result.shouldGenerateExtraViews).toBe(false)
    expect(result.tryOnEnabled).toBe(false)
  })

  it('autoPublishBlog reflects only the global toggle (no product gate)', () => {
    const on: AutomationSettingsSnapshot = {
      contentGeneration: { autoPublishBlog: true },
    }
    const off: AutomationSettingsSnapshot = {
      contentGeneration: { autoPublishBlog: false },
    }
    expect(resolveContentDecision(null, false, on).shouldAutoPublishBlog).toBe(true)
    expect(resolveContentDecision(null, false, off).shouldAutoPublishBlog).toBe(false)
  })
})

// ─── fetchAutomationSettings ─────────────────────────────────────────────────

describe('fetchAutomationSettings', () => {
  it('returns the settings object from payload.findGlobal on success', async () => {
    const mockSettings: AutomationSettingsSnapshot = {
      productIntake: { autoActivateProducts: true },
    }
    const mockPayload = {
      findGlobal: vi.fn().mockResolvedValue(mockSettings),
    }
    const result = await fetchAutomationSettings(mockPayload)
    expect(result).toEqual(mockSettings)
    expect(mockPayload.findGlobal).toHaveBeenCalledWith({ slug: 'automation-settings' })
  })

  it('returns null when payload.findGlobal throws', async () => {
    const mockPayload = {
      findGlobal: vi.fn().mockRejectedValue(new Error('DB connection failed')),
    }
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const result = await fetchAutomationSettings(mockPayload)
    expect(result).toBeNull()
    expect(warnSpy).toHaveBeenCalled()
    warnSpy.mockRestore()
  })

  it('returns null and logs non-Error thrown values', async () => {
    const mockPayload = {
      findGlobal: vi.fn().mockRejectedValue('string error'),
    }
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const result = await fetchAutomationSettings(mockPayload)
    expect(result).toBeNull()
    warnSpy.mockRestore()
  })
})
