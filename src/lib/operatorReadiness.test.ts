import assert from 'node:assert'
import { summarizeOperatorReadiness, type OperatorReadinessCheck } from './operatorReadiness'

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

const basicChecksPass: OperatorReadinessCheck[] = [
  { label: 'title', ok: true },
  { label: 'price', ok: true },
  { label: 'image', ok: true },
  { label: 'stock', ok: true },
  { label: 'target', ok: true },
]

check('central readiness blockers prevent a ready banner even when basic fields pass', () => {
  const summary = summarizeOperatorReadiness({
    status: 'draft',
    checks: basicChecksPass,
    readiness: {
      level: 'partially_ready',
      passedCount: 4,
      totalCount: 6,
      blockers: ['confirmation: Awaiting confirmation', 'content: Content not yet generated'],
    },
  })

  assert.strictEqual(summary.bannerState, 'blocked')
  assert.strictEqual(summary.isReadyToPublish, false)
  assert.deepStrictEqual(summary.fieldBlockers, [])
  assert.strictEqual(summary.readinessBlockers.length, 2)
})

check('field blockers prevent readiness even when central readiness passes', () => {
  const summary = summarizeOperatorReadiness({
    status: 'draft',
    checks: [...basicChecksPass, { label: 'brand safety', ok: false }],
    readiness: {
      level: 'ready',
      passedCount: 6,
      totalCount: 6,
      blockers: [],
    },
  })

  assert.strictEqual(summary.bannerState, 'blocked')
  assert.strictEqual(summary.isReadyToPublish, false)
  assert.deepStrictEqual(summary.fieldBlockers.map((blocker) => blocker.label), ['brand safety'])
})

check('ready banner requires central readiness plus no field blockers', () => {
  const summary = summarizeOperatorReadiness({
    status: 'draft',
    checks: [...basicChecksPass, { label: 'sku', ok: false, warn: true }],
    readiness: {
      level: 'ready',
      passedCount: 6,
      totalCount: 6,
      blockers: [],
    },
  })

  assert.strictEqual(summary.bannerState, 'ready')
  assert.strictEqual(summary.isReadyToPublish, true)
  assert.strictEqual(summary.warnings.length, 1)
})

check('active products show published state independent of draft readiness', () => {
  const summary = summarizeOperatorReadiness({
    status: 'active',
    checks: [{ label: 'content', ok: false }],
    readiness: {
      level: 'not_ready',
      passedCount: 2,
      totalCount: 6,
      blockers: ['content: Content not yet generated'],
    },
  })

  assert.strictEqual(summary.bannerState, 'published')
  assert.strictEqual(summary.isPublished, true)
  assert.strictEqual(summary.isReadyToPublish, false)
})

console.log(`\noperatorReadiness: ${passed} checks passed${process.exitCode ? ' - WITH FAILURES' : ' - ALL OK'}`)
