/**
 * automationDecision.test.ts - standalone checks for automation intake decisions.
 *
 * Run: `tsx src/lib/automationDecision.test.ts`.
 */
import assert from 'node:assert'
import {
  resolveChannelTargets,
  resolveProductStatus,
  type AutomationSettingsSnapshot,
} from './automationDecision'
import type { PublishReadinessResult } from './telegram'

let passed = 0

async function check(name: string, fn: () => void | Promise<void>) {
  try {
    await fn()
    passed++
    console.log(`  ok - ${name}`)
  } catch (e) {
    console.error(`  fail - ${name}\n    ${(e as Error).message}`)
    process.exitCode = 1
  }
}

const ready: PublishReadinessResult = {
  isReady: true,
  missingCritical: [],
  warnings: [],
  score: 100,
}

const settings: AutomationSettingsSnapshot = {
  productIntake: {
    autoActivateProducts: true,
    requireAdminReview: false,
    minConfidenceToActivate: 60,
  },
}

const allChannelsEnabled: AutomationSettingsSnapshot = {
  channelPublishing: {
    publishWebsite: true,
    publishInstagram: true,
    publishShopier: true,
    publishX: true,
    publishFacebook: true,
  },
}

async function main() {
  await check('automation intake remains draft even when all legacy auto-activate gates pass', () => {
    const decision = resolveProductStatus({
      parseConfidence: 95,
      readiness: ready,
      explicitStatus: 'active',
      productAutoActivateOverride: true,
    }, settings)

    assert.strictEqual(decision.status, 'draft')
    assert.strictEqual(decision.blockedBy, 'operator_approval_required')
    assert.ok(decision.reason.includes('Operatör onayı'), decision.reason)
  })

  await check('missing readiness still explains the concrete readiness blocker', () => {
    const decision = resolveProductStatus({
      parseConfidence: 95,
      readiness: {
        isReady: false,
        missingCritical: ['image'],
        warnings: [],
        score: 80,
      },
    }, settings)

    assert.strictEqual(decision.status, 'draft')
    assert.strictEqual(decision.blockedBy, 'readiness_failed')
    assert.ok(decision.reason.includes('image'), decision.reason)
  })

  await check('channel decision keeps all active channels when globally enabled', () => {
    const decision = resolveChannelTargets(
      ['website', 'instagram', 'shopier', 'x', 'facebook'],
      allChannelsEnabled,
    )

    assert.deepStrictEqual(decision.effectiveTargets, ['website', 'instagram', 'shopier', 'x', 'facebook'])
    assert.deepStrictEqual(decision.blockedByGlobal, [])
  })

  await check('channel decision drops retired and unknown channels', () => {
    const decision = resolveChannelTargets(
      ['website', 'dolap', 'threads', 'tiktok'],
      allChannelsEnabled,
    )

    assert.deepStrictEqual(decision.effectiveTargets, ['website'])
    assert.deepStrictEqual(decision.blockedByGlobal, [])
  })

  await check('channel decision reports globally disabled active channels', () => {
    const decision = resolveChannelTargets(
      ['website', 'instagram', 'shopier', 'x', 'facebook'],
      {
        channelPublishing: {
          publishWebsite: true,
          publishInstagram: false,
          publishShopier: false,
          publishX: false,
          publishFacebook: true,
        },
      },
    )

    assert.deepStrictEqual(decision.effectiveTargets, ['website', 'facebook'])
    assert.deepStrictEqual(decision.blockedByGlobal, ['instagram', 'shopier', 'x'])
  })

  console.log(`\nautomationDecision: ${passed} checks passed${process.exitCode ? ' - WITH FAILURES' : ' - ALL OK'}`)
}

void main()
