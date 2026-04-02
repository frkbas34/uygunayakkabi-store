import { describe, it, expect, vi } from 'vitest'
import {
  resolveProductStatus,
  resolveChannelTargets,
  resolveContentDecision,
  fetchAutomationSettings,
  type AutomationSettingsSnapshot,
  type StatusDecisionInput,
} from '../automationDecision'

// ─── Shared fixtures ───────────────────────────────────────────────────────

const readyResult = { isReady: true, missingCritical: [], warnings: [], score: 100 }
const notReadyResult = { isReady: false, missingCritical: ['Ürün adı', 'Satış fiyatı'], warnings: [], score: 43 }

const settingsAllOn: AutomationSettingsSnapshot = {
  productIntake: {
    autoActivateProducts: true,
    requireAdminReview: false,
    minConfidenceToActivate: 60,
  },
  channelPublishing: {
    publishWebsite: true,
    publishInstagram: true,
    publishShopier: true,
    publishDolap: true,
    publishX: false,
    publishFacebook: false,
    publishLinkedin: false,
    publishThreads: false,
  },
  contentGeneration: {
    autoGenerateBlog: true,
    autoPublishBlog: true,
    autoGenerateExtraViews: true,
    enableTryOn: true,
  },
}

const settingsAllOff: AutomationSettingsSnapshot = {
  productIntake: {
    autoActivateProducts: false,
    requireAdminReview: false,
    minConfidenceToActivate: 60,
  },
  channelPublishing: {
    publishWebsite: false,
    publishInstagram: false,
    publishShopier: false,
  },
  contentGeneration: {
    autoGenerateBlog: false,
    autoPublishBlog: false,
    autoGenerateExtraViews: false,
    enableTryOn: false,
  },
}

// ─── resolveProductStatus ──────────────────────────────────────────────────

describe('resolveProductStatus', () => {
  describe('explicit draft request', () => {
    it('returns draft when explicitStatus is "draft"', () => {
      const input: StatusDecisionInput = { readiness: readyResult, explicitStatus: 'draft', parseConfidence: 100 }
      const result = resolveProductStatus(input, settingsAllOn)
      expect(result.status).toBe('draft')
      expect(result.blockedBy).toBe('explicit_draft')
    })

    it('explicit draft overrides even high confidence and ready state', () => {
      const input: StatusDecisionInput = { readiness: readyResult, explicitStatus: 'draft', parseConfidence: 100, productAutoActivateOverride: true }
      const result = resolveProductStatus(input, settingsAllOn)
      expect(result.status).toBe('draft')
      expect(result.blockedBy).toBe('explicit_draft')
    })
  })

  describe('settings unavailable', () => {
    it('returns draft when settings is null', () => {
      const input: StatusDecisionInput = { readiness: readyResult, parseConfidence: 100 }
      const result = resolveProductStatus(input, null)
      expect(result.status).toBe('draft')
      expect(result.blockedBy).toBe('settings_unavailable')
    })

    it('returns draft when settings is undefined', () => {
      const input: StatusDecisionInput = { readiness: readyResult, parseConfidence: 100 }
      const result = resolveProductStatus(input, undefined)
      expect(result.status).toBe('draft')
      expect(result.blockedBy).toBe('settings_unavailable')
    })
  })

  describe('require admin review', () => {
    it('returns draft when requireAdminReview is true', () => {
      const settings: AutomationSettingsSnapshot = {
        productIntake: { requireAdminReview: true, autoActivateProducts: true, minConfidenceToActivate: 0 },
      }
      const input: StatusDecisionInput = { readiness: readyResult, parseConfidence: 100 }
      const result = resolveProductStatus(input, settings)
      expect(result.status).toBe('draft')
      expect(result.blockedBy).toBe('require_admin_review')
    })

    it('defaults requireAdminReview to true when absent (safe default)', () => {
      const settings: AutomationSettingsSnapshot = {
        productIntake: { autoActivateProducts: true },
      }
      const input: StatusDecisionInput = { readiness: readyResult, parseConfidence: 100 }
      const result = resolveProductStatus(input, settings)
      expect(result.status).toBe('draft')
      expect(result.blockedBy).toBe('require_admin_review')
    })
  })

  describe('auto-activate toggle', () => {
    it('returns draft when autoActivateProducts is false', () => {
      const settings: AutomationSettingsSnapshot = {
        productIntake: { autoActivateProducts: false, requireAdminReview: false },
      }
      const input: StatusDecisionInput = { readiness: readyResult, parseConfidence: 100 }
      const result = resolveProductStatus(input, settings)
      expect(result.status).toBe('draft')
      expect(result.blockedBy).toBe('auto_activate_off')
    })

    it('productAutoActivateOverride=true overrides global autoActivateProducts=false', () => {
      const settings: AutomationSettingsSnapshot = {
        productIntake: { autoActivateProducts: false, requireAdminReview: false, minConfidenceToActivate: 0 },
      }
      const input: StatusDecisionInput = { readiness: readyResult, parseConfidence: 100, productAutoActivateOverride: true }
      const result = resolveProductStatus(input, settings)
      expect(result.status).toBe('active')
    })

    it('productAutoActivateOverride=false overrides global autoActivateProducts=true', () => {
      const settings: AutomationSettingsSnapshot = {
        productIntake: { autoActivateProducts: true, requireAdminReview: false, minConfidenceToActivate: 0 },
      }
      const input: StatusDecisionInput = { readiness: readyResult, parseConfidence: 100, productAutoActivateOverride: false }
      const result = resolveProductStatus(input, settings)
      expect(result.status).toBe('draft')
      expect(result.blockedBy).toBe('auto_activate_off')
    })
  })

  describe('confidence gate', () => {
    it('returns draft when parseConfidence is below threshold', () => {
      const settings: AutomationSettingsSnapshot = {
        productIntake: { autoActivateProducts: true, requireAdminReview: false, minConfidenceToActivate: 60 },
      }
      const input: StatusDecisionInput = { readiness: readyResult, parseConfidence: 59 }
      const result = resolveProductStatus(input, settings)
      expect(result.status).toBe('draft')
      expect(result.blockedBy).toBe('confidence_below_threshold')
      expect(result.reason).toContain('59%')
      expect(result.reason).toContain('60%')
    })

    it('passes when parseConfidence equals threshold exactly', () => {
      const settings: AutomationSettingsSnapshot = {
        productIntake: { autoActivateProducts: true, requireAdminReview: false, minConfidenceToActivate: 60 },
      }
      const input: StatusDecisionInput = { readiness: readyResult, parseConfidence: 60 }
      const result = resolveProductStatus(input, settings)
      expect(result.status).toBe('active')
    })

    it('treats absent parseConfidence as 0', () => {
      const settings: AutomationSettingsSnapshot = {
        productIntake: { autoActivateProducts: true, requireAdminReview: false, minConfidenceToActivate: 1 },
      }
      const input: StatusDecisionInput = { readiness: readyResult }
      const result = resolveProductStatus(input, settings)
      expect(result.status).toBe('draft')
      expect(result.blockedBy).toBe('confidence_below_threshold')
    })
  })

  describe('readiness gate', () => {
    it('returns draft when readiness.isReady is false', () => {
      const settings: AutomationSettingsSnapshot = {
        productIntake: { autoActivateProducts: true, requireAdminReview: false, minConfidenceToActivate: 0 },
      }
      const input: StatusDecisionInput = { readiness: notReadyResult, parseConfidence: 100 }
      const result = resolveProductStatus(input, settings)
      expect(result.status).toBe('draft')
      expect(result.blockedBy).toBe('readiness_failed')
      expect(result.reason).toContain('Ürün adı')
    })
  })

  describe('all gates passed', () => {
    it('returns active when all conditions are satisfied', () => {
      const input: StatusDecisionInput = { readiness: readyResult, parseConfidence: 75 }
      const result = resolveProductStatus(input, settingsAllOn)
      expect(result.status).toBe('active')
      expect(result.blockedBy).toBeUndefined()
      expect(result.reason).toContain('75%')
    })
  })
})

// ─── resolveChannelTargets ─────────────────────────────────────────────────

describe('resolveChannelTargets', () => {
  it('defaults to ["website"] when productTargets is null', () => {
    const result = resolveChannelTargets(null, settingsAllOn)
    expect(result.effectiveTargets).toContain('website')
  })

  it('defaults to ["website"] when productTargets is undefined', () => {
    const result = resolveChannelTargets(undefined, settingsAllOn)
    expect(result.effectiveTargets).toContain('website')
  })

  it('returns only globally-enabled channels', () => {
    const targets = ['website', 'instagram', 'shopier', 'x', 'facebook']
    const result = resolveChannelTargets(targets, settingsAllOn)
    expect(result.effectiveTargets).toEqual(expect.arrayContaining(['website', 'instagram', 'shopier']))
    expect(result.effectiveTargets).not.toContain('x')
    expect(result.effectiveTargets).not.toContain('facebook')
  })

  it('puts globally-disabled channels in blockedByGlobal', () => {
    const targets = ['website', 'instagram', 'x']
    const result = resolveChannelTargets(targets, settingsAllOn)
    expect(result.blockedByGlobal).toContain('x')
  })

  it('silently drops unknown channels', () => {
    const targets = ['website', 'tiktok', 'unknown_channel']
    const result = resolveChannelTargets(targets, settingsAllOn)
    expect(result.effectiveTargets).toEqual(['website'])
    expect(result.blockedByGlobal).toEqual([])
  })

  it('lowercases channel names before matching', () => {
    const targets = ['Website', 'INSTAGRAM']
    const result = resolveChannelTargets(targets, settingsAllOn)
    expect(result.effectiveTargets).toContain('website')
    expect(result.effectiveTargets).toContain('instagram')
  })

  it('returns empty effectiveTargets when all channels are globally disabled', () => {
    const targets = ['instagram', 'shopier']
    const result = resolveChannelTargets(targets, settingsAllOff)
    expect(result.effectiveTargets).toHaveLength(0)
    expect(result.blockedByGlobal).toEqual(expect.arrayContaining(['instagram', 'shopier']))
  })

  it('handles null settings (uses safe defaults)', () => {
    const targets = ['website', 'instagram']
    const result = resolveChannelTargets(targets, null)
    // website is on by default, instagram is off by default
    expect(result.effectiveTargets).toContain('website')
    expect(result.blockedByGlobal).toContain('instagram')
  })

  it('includes summary string', () => {
    const result = resolveChannelTargets(['website'], settingsAllOn)
    expect(typeof result.summary).toBe('string')
    expect(result.summary.length).toBeGreaterThan(0)
  })

  it('summary mentions no active channel when all are blocked', () => {
    const result = resolveChannelTargets(['instagram'], settingsAllOff)
    expect(result.summary).toContain('Hiçbir kanal aktif değil')
  })
})

// ─── resolveContentDecision ───────────────────────────────────────────────

describe('resolveContentDecision', () => {
  const allProductFlags = { generateBlog: true, generateExtraViews: true, enableTryOn: true }
  const noProductFlags = { generateBlog: false, generateExtraViews: false, enableTryOn: false }

  it('returns all false when settings and product flags are all off', () => {
    const result = resolveContentDecision(noProductFlags, false, settingsAllOff)
    expect(result.shouldGenerateBlog).toBe(false)
    expect(result.shouldAutoPublishBlog).toBe(false)
    expect(result.shouldGenerateExtraViews).toBe(false)
    expect(result.tryOnEnabled).toBe(false)
  })

  it('enables blog generation when global on AND product flag on', () => {
    const result = resolveContentDecision(allProductFlags, false, settingsAllOn)
    expect(result.shouldGenerateBlog).toBe(true)
  })

  it('enables blog generation when global on AND seoRequested is true (even if product flag off)', () => {
    const result = resolveContentDecision(noProductFlags, true, settingsAllOn)
    expect(result.shouldGenerateBlog).toBe(true)
  })

  it('blocks blog when global is off even if product flag and seoRequested are on', () => {
    const result = resolveContentDecision(allProductFlags, true, settingsAllOff)
    expect(result.shouldGenerateBlog).toBe(false)
  })

  it('enables extra views only when both global and product flags are on', () => {
    const result = resolveContentDecision(allProductFlags, false, settingsAllOn)
    expect(result.shouldGenerateExtraViews).toBe(true)
  })

  it('blocks extra views when product flag is off', () => {
    const result = resolveContentDecision(noProductFlags, false, settingsAllOn)
    expect(result.shouldGenerateExtraViews).toBe(false)
  })

  it('enables tryOn only when both global and product flags are on', () => {
    const result = resolveContentDecision(allProductFlags, false, settingsAllOn)
    expect(result.tryOnEnabled).toBe(true)
  })

  it('blocks tryOn when product flag is off', () => {
    const result = resolveContentDecision(noProductFlags, false, settingsAllOn)
    expect(result.tryOnEnabled).toBe(false)
  })

  it('handles null productFlags gracefully', () => {
    const result = resolveContentDecision(null, false, settingsAllOn)
    expect(result.shouldGenerateBlog).toBe(false)
    expect(result.shouldGenerateExtraViews).toBe(false)
    expect(result.tryOnEnabled).toBe(false)
  })

  it('handles null settings (uses safe defaults — all off)', () => {
    const result = resolveContentDecision(allProductFlags, true, null)
    expect(result.shouldGenerateBlog).toBe(false)
    expect(result.shouldAutoPublishBlog).toBe(false)
    expect(result.shouldGenerateExtraViews).toBe(false)
    expect(result.tryOnEnabled).toBe(false)
  })
})

// ─── fetchAutomationSettings ───────────────────────────────────────────────

describe('fetchAutomationSettings', () => {
  it('returns settings when findGlobal succeeds', async () => {
    const mockSettings: AutomationSettingsSnapshot = { productIntake: { autoActivateProducts: true } }
    const payload = { findGlobal: vi.fn().mockResolvedValue(mockSettings) }
    const result = await fetchAutomationSettings(payload)
    expect(result).toEqual(mockSettings)
    expect(payload.findGlobal).toHaveBeenCalledWith({ slug: 'automation-settings' })
  })

  it('returns null and logs a warning when findGlobal throws', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const payload = { findGlobal: vi.fn().mockRejectedValue(new Error('DB error')) }
    const result = await fetchAutomationSettings(payload)
    expect(result).toBeNull()
    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  it('handles non-Error thrown values', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const payload = { findGlobal: vi.fn().mockRejectedValue('string error') }
    const result = await fetchAutomationSettings(payload)
    expect(result).toBeNull()
    consoleSpy.mockRestore()
  })
})
