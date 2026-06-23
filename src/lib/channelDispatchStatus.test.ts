/**
 * channelDispatchStatus.test.ts - standalone checks for per-channel dispatch
 * state summaries. No test framework required.
 */
import assert from 'node:assert'
import {
  buildChannelDispatchOverview,
  summarizeChannelDispatchResult,
  type DispatchChannelResultLike,
} from './channelDispatchStatus'

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

function result(overrides: Partial<DispatchChannelResultLike>): DispatchChannelResultLike {
  return {
    channel: 'instagram',
    eligible: true,
    dispatched: false,
    webhookConfigured: true,
    ...overrides,
  }
}

check('dispatched channel is published and redispatchable', () => {
  const summary = summarizeChannelDispatchResult(result({ dispatched: true }))
  assert.strictEqual(summary.state, 'published')
  assert.strictEqual(summary.canRedispatch, true)
})

check('ineligible channel is blocked and not redispatchable', () => {
  const summary = summarizeChannelDispatchResult(result({
    eligible: false,
    skippedReason: 'brand_safety_block: Nike',
  }))
  assert.strictEqual(summary.state, 'blocked')
  assert.strictEqual(summary.reason, 'brand_safety_block: Nike')
  assert.strictEqual(summary.canRedispatch, false)
})

check('Shopier jobs queue result is queued', () => {
  const summary = summarizeChannelDispatchResult(result({
    channel: 'shopier',
    skippedReason: 'queued-via-jobs-queue',
  }))
  assert.strictEqual(summary.state, 'queued')
  assert.strictEqual(summary.canRedispatch, false)
})

check('dry run preview is preview', () => {
  const summary = summarizeChannelDispatchResult(result({
    skippedReason: 'dry-run-preview',
  }))
  assert.strictEqual(summary.state, 'preview')
  assert.strictEqual(summary.canRedispatch, false)
})

check('error result is failed and redispatchable', () => {
  const summary = summarizeChannelDispatchResult(result({
    error: 'HTTP 500',
  }))
  assert.strictEqual(summary.state, 'failed')
  assert.strictEqual(summary.reason, 'HTTP 500')
  assert.strictEqual(summary.canRedispatch, true)
})

check('missing webhook config is not_configured', () => {
  const summary = summarizeChannelDispatchResult(result({
    webhookConfigured: false,
    skippedReason: 'N8N_CHANNEL_INSTAGRAM_WEBHOOK env var not configured',
  }))
  assert.strictEqual(summary.state, 'not_configured')
  assert.strictEqual(summary.canRedispatch, true)
})

check('eligible non-dispatched result with configured webhook is skipped', () => {
  const summary = summarizeChannelDispatchResult(result({
    skippedReason: 'not in onlyChannels',
  }))
  assert.strictEqual(summary.state, 'skipped')
  assert.strictEqual(summary.reason, 'not in onlyChannels')
})

check('overview creates visible rows for website and unrecorded external targets', () => {
  const rows = buildChannelDispatchOverview(['website', 'instagram'], [])
  assert.strictEqual(rows.length, 2)

  const website = rows.find((row) => row.channel === 'website')
  assert.ok(website)
  assert.strictEqual(website.hasResult, false)
  assert.strictEqual(summarizeChannelDispatchResult(website).state, 'published')
  assert.strictEqual(summarizeChannelDispatchResult(website).canRedispatch, false)

  const instagram = rows.find((row) => row.channel === 'instagram')
  assert.ok(instagram)
  assert.strictEqual(instagram.hasResult, false)
  const instagramSummary = summarizeChannelDispatchResult(instagram)
  assert.strictEqual(instagramSummary.state, 'unrecorded')
  assert.strictEqual(instagramSummary.reason, 'No dispatch result recorded yet')
  assert.strictEqual(instagramSummary.canRedispatch, true)
})

check('overview prefers latest result note and keeps historical non-target notes', () => {
  const rows = buildChannelDispatchOverview(['website', 'x'], [
    result({ channel: 'x', error: 'old error', timestamp: 'old' }),
    result({ channel: 'x', dispatched: true, timestamp: 'new' }),
    result({ channel: 'facebook', eligible: false, skippedReason: 'not targeted' }),
  ])

  assert.deepStrictEqual(rows.map((row) => row.channel), ['website', 'x', 'facebook'])
  const x = rows.find((row) => row.channel === 'x')
  assert.ok(x)
  assert.strictEqual(x.hasResult, true)
  assert.strictEqual(x.timestamp, 'new')
  assert.strictEqual(summarizeChannelDispatchResult(x).state, 'published')

  const facebook = rows.find((row) => row.channel === 'facebook')
  assert.ok(facebook)
  assert.strictEqual(facebook.hasResult, true)
  assert.strictEqual(summarizeChannelDispatchResult(facebook).state, 'blocked')
})

console.log(`\nchannelDispatchStatus: ${passed} checks passed${process.exitCode ? ' - WITH FAILURES' : ' - ALL OK'}`)
