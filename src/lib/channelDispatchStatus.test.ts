/**
 * channelDispatchStatus.test.ts - standalone checks for per-channel dispatch
 * state summaries. No test framework required.
 */
import assert from 'node:assert'
import { summarizeChannelDispatchResult, type DispatchChannelResultLike } from './channelDispatchStatus'

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

console.log(`\nchannelDispatchStatus: ${passed} checks passed${process.exitCode ? ' - WITH FAILURES' : ' - ALL OK'}`)
