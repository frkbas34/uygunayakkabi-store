/**
 * productLifecycle.test.ts - standalone checks for the canonical operator
 * lifecycle mapping. No test framework required.
 */
import assert from 'node:assert'
import { deriveProductLifecycle, formatProductLifecycle } from './productLifecycle'

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

check('empty or plain draft maps to draft', () => {
  assert.strictEqual(deriveProductLifecycle(null), 'draft')
  assert.strictEqual(deriveProductLifecycle({ status: 'draft' }), 'draft')
})

check('active storefront status maps to active', () => {
  assert.strictEqual(
    deriveProductLifecycle({
      status: 'active',
      workflow: { workflowStatus: 'publish_ready', stockState: 'in_stock' },
    }),
    'active',
  )
})

check('soldout status and sold_out stock state map to sold_out', () => {
  assert.strictEqual(deriveProductLifecycle({ status: 'soldout' }), 'sold_out')
  assert.strictEqual(
    deriveProductLifecycle({ status: 'draft', workflow: { stockState: 'sold_out' } }),
    'sold_out',
  )
})

check('publish_ready workflow maps to ready_to_publish', () => {
  assert.strictEqual(
    deriveProductLifecycle({ status: 'draft', workflow: { workflowStatus: 'publish_ready' } }),
    'ready_to_publish',
  )
})

check('pre-publish workflow stages map to needs_review', () => {
  for (const workflowStatus of ['visual_pending', 'confirmation_pending', 'confirmed', 'content_ready', 'audit_pending']) {
    assert.strictEqual(
      deriveProductLifecycle({ status: 'draft', workflow: { workflowStatus } }),
      'needs_review',
      workflowStatus,
    )
  }
})

check('audit blockers map to needs_review', () => {
  assert.strictEqual(
    deriveProductLifecycle({ status: 'draft', workflow: { auditStatus: 'needs_revision' } }),
    'needs_review',
  )
  assert.strictEqual(
    deriveProductLifecycle({ status: 'draft', auditResult: { overallResult: 'failed' } }),
    'needs_review',
  )
})

check('formatter returns shared operator label', () => {
  assert.strictEqual(
    formatProductLifecycle({ status: 'draft', workflow: { workflowStatus: 'publish_ready' } }),
    'Ready to publish',
  )
})

console.log(`\nproductLifecycle: ${passed} checks passed${process.exitCode ? ' - WITH FAILURES' : ' - ALL OK'}`)
