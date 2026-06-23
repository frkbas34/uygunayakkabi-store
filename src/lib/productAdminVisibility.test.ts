import assert from 'node:assert'
import { shouldShowSourceMeta } from './productAdminVisibility'

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

check('fresh admin/manual drafts keep source meta hidden', () => {
  assert.strictEqual(shouldShowSourceMeta(undefined), false)
  assert.strictEqual(shouldShowSourceMeta({ source: 'admin', status: 'draft' }), false)
  assert.strictEqual(
    shouldShowSourceMeta({
      source: 'admin',
      status: 'draft',
      sourceMeta: { shopierSyncStatus: 'not_synced', storyStatus: 'none' },
    }),
    false,
  )
})

check('automation and imported products show source meta', () => {
  for (const source of ['telegram', 'n8n', 'api', 'import', 'supplier_scout']) {
    assert.strictEqual(shouldShowSourceMeta({ source, status: 'draft' }), true, source)
  }
})

check('legacy automation flag still shows source meta', () => {
  assert.strictEqual(
    shouldShowSourceMeta({ source: 'admin', status: 'draft', createdByAutomation: true }),
    true,
  )
})

check('active and sold-out admin products show dispatch controls', () => {
  assert.strictEqual(shouldShowSourceMeta({ source: 'admin', status: 'active' }), true)
  assert.strictEqual(shouldShowSourceMeta({ source: 'admin', status: 'soldout' }), true)
})

check('admin drafts with real dispatch or sync metadata show source meta', () => {
  assert.strictEqual(
    shouldShowSourceMeta({ source: 'admin', status: 'draft', sourceMeta: { dispatchNotes: '[]' } }),
    true,
  )
  assert.strictEqual(
    shouldShowSourceMeta({ source: 'admin', status: 'draft', sourceMeta: { shopierSyncStatus: 'queued' } }),
    true,
  )
  assert.strictEqual(
    shouldShowSourceMeta({ source: 'admin', status: 'draft', sourceMeta: { storyStatus: 'failed' } }),
    true,
  )
})

console.log(`\nproductAdminVisibility: ${passed} checks passed${process.exitCode ? ' - WITH FAILURES' : ' - ALL OK'}`)
