/**
 * channelProviderHealth.test.ts - safe config visibility checks for active
 * publishing providers. No external APIs are called and no secret values are
 * printed.
 */
import assert from 'node:assert'
import {
  evaluateChannelProviderHealth,
  formatChannelProviderHealthLine,
  type ChannelProviderHealth,
} from './channelProviderHealth'
import type { AutomationSettingsSnapshot } from './automationDecision'

let passed = 0

function check(name: string, fn: () => void) {
  try {
    fn()
    passed++
    console.log(`  ok - ${name}`)
  } catch (e) {
    console.error(`  fail - ${name}\n    ${(e as Error).message}`)
    process.exitCode = 1
  }
}

function byChannel(rows: ChannelProviderHealth[], channel: ChannelProviderHealth['channel']): ChannelProviderHealth {
  const row = rows.find((entry) => entry.channel === channel)
  assert.ok(row, `missing health row for ${channel}`)
  return row
}

check('website is always native-ready without credentials', () => {
  const rows = evaluateChannelProviderHealth(null, {})
  const website = byChannel(rows, 'website')

  assert.strictEqual(website.state, 'ready')
  assert.strictEqual(website.mode, 'native')
  assert.deepStrictEqual(website.missing, [])
})

check('Meta channels report direct readiness from AutomationSettings tokens', () => {
  const settings: AutomationSettingsSnapshot = {
    instagramTokens: {
      accessToken: 'secret-meta-token',
      userId: 'ig-user',
      facebookPageId: 'fb-page',
    },
  }
  const rows = evaluateChannelProviderHealth(settings, {})

  assert.strictEqual(byChannel(rows, 'instagram').state, 'ready')
  assert.strictEqual(byChannel(rows, 'instagram').mode, 'direct')
  assert.strictEqual(byChannel(rows, 'facebook').state, 'ready')
  assert.strictEqual(byChannel(rows, 'facebook').mode, 'direct')
})

check('configured webhook is reported as fallback when direct credentials are missing', () => {
  const rows = evaluateChannelProviderHealth({}, {
    N8N_CHANNEL_INSTAGRAM_WEBHOOK: 'https://example.test/ig',
  })
  const instagram = byChannel(rows, 'instagram')

  assert.strictEqual(instagram.state, 'fallback')
  assert.strictEqual(instagram.mode, 'webhook')
  assert.ok(instagram.missing.includes('AutomationSettings.instagramTokens.accessToken'))
  assert.ok(instagram.missing.includes('AutomationSettings.instagramTokens.userId'))
})

check('X requires the full OAuth 1.0a env set for direct readiness', () => {
  const rows = evaluateChannelProviderHealth({}, {
    X_ACCESS_TOKEN: 'secret-token',
  })
  const x = byChannel(rows, 'x')

  assert.strictEqual(x.state, 'missing')
  assert.strictEqual(x.mode, 'none')
  assert.ok(x.missing.includes('X_API_KEY'))
  assert.ok(x.missing.includes('X_API_SECRET'))
  assert.ok(x.missing.includes('X_ACCESS_TOKEN_SECRET'))
})

check('Shopier reports direct readiness from SHOPIER_PAT', () => {
  const rows = evaluateChannelProviderHealth({}, {
    SHOPIER_PAT: 'secret-shopier-token',
  })
  const shopier = byChannel(rows, 'shopier')

  assert.strictEqual(shopier.state, 'ready')
  assert.strictEqual(shopier.mode, 'direct')
  assert.deepStrictEqual(shopier.missing, [])
})

check('global channel disable overrides credential readiness', () => {
  const rows = evaluateChannelProviderHealth({
    channelPublishing: {
      publishX: false,
    },
  }, {
    X_API_KEY: 'secret-key',
    X_API_SECRET: 'secret-secret',
    X_ACCESS_TOKEN: 'secret-token',
    X_ACCESS_TOKEN_SECRET: 'secret-token-secret',
  })
  const x = byChannel(rows, 'x')

  assert.strictEqual(x.state, 'disabled')
  assert.strictEqual(x.mode, 'none')
  assert.deepStrictEqual(x.missing, [])
})

check('formatted health lines expose key names but not secret values', () => {
  const line = formatChannelProviderHealthLine(byChannel(evaluateChannelProviderHealth({}, {
    N8N_CHANNEL_FACEBOOK_WEBHOOK: 'https://secret.example/webhook',
  }), 'facebook'))

  assert.ok(line.includes('N8N_CHANNEL_FACEBOOK_WEBHOOK'))
  assert.ok(!line.includes('https://secret.example/webhook'))
})

console.log(`\nchannelProviderHealth: ${passed} checks passed${process.exitCode ? ' - WITH FAILURES' : ' - ALL OK'}`)
