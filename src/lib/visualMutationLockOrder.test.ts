import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import {
  createVisualMutationLockSequence,
  orderVisualMutationLocks,
  VISUAL_MUTATION_LOCK_ORDER,
  type VisualMutationLockSurface,
} from './visualMutationLockOrder'
import { VISUAL_ONLY_APPROVAL_LOCK_ORDER } from './visualOnlyApprovalRuntime'

type Transaction = 'controlled' | 'visual'
type RelevantPostgresLockMode = 'row-share' | 'row-exclusive' | 'share-row-exclusive'

function postgresLocksConflict(
  left: RelevantPostgresLockMode,
  right: RelevantPostgresLockMode,
): boolean {
  if (left === 'row-share' || right === 'row-share') return false
  return left === 'share-row-exclusive' || right === 'share-row-exclusive'
}

function deadlockSchedule(controlledOrder: readonly VisualMutationLockSurface[]): boolean {
  const owners = new Map<VisualMutationLockSurface, Array<{
    transaction: Transaction
    mode: RelevantPostgresLockMode
  }>>()
  const waits = new Map<Transaction, Transaction>()
  const acquire = (
    transaction: Transaction,
    surface: VisualMutationLockSurface,
    mode: RelevantPostgresLockMode,
  ): boolean => {
    const owner = owners.get(surface)?.find((lock) => (
      lock.transaction !== transaction && postgresLocksConflict(lock.mode, mode)
    ))
    if (owner) {
      waits.set(transaction, owner.transaction)
      return false
    }
    const held = owners.get(surface) ?? []
    held.push({ transaction, mode })
    owners.set(surface, held)
    return true
  }

  if (controlledOrder[0] === 'products') {
    acquire('controlled', 'products', 'share-row-exclusive')
    acquire('visual', 'image-generation-jobs', 'row-exclusive')
    acquire('visual', 'products', 'row-share')
    acquire('controlled', 'image-generation-jobs', 'share-row-exclusive')
    acquire('visual', 'products', 'row-exclusive')
  } else {
    acquire('visual', 'image-generation-jobs', 'row-exclusive')
    if (acquire('controlled', controlledOrder[0]!, 'share-row-exclusive')) {
      acquire('controlled', controlledOrder[1]!, 'share-row-exclusive')
    }
    acquire('visual', 'products', 'row-share')
    acquire('visual', 'products', 'row-exclusive')
  }
  return waits.get('controlled') === 'visual' && waits.get('visual') === 'controlled'
}

function main(): void {
  assert.deepEqual(VISUAL_MUTATION_LOCK_ORDER, [
    'image-generation-jobs', 'products', 'products-rels', 'media',
    'payload-jobs', 'bot-events', 'story-jobs',
  ])
  assert.deepEqual(VISUAL_ONLY_APPROVAL_LOCK_ORDER, VISUAL_MUTATION_LOCK_ORDER.slice(0, 2))

  const authority = new Map(VISUAL_MUTATION_LOCK_ORDER.map((surface) => [surface, `table:${surface}`]))
  assert.deepEqual(
    orderVisualMutationLocks(authority),
    VISUAL_MUTATION_LOCK_ORDER.map((surface) => `table:${surface}`),
  )
  assert.throws(
    () => orderVisualMutationLocks(new Map([['products', 'table:products']])),
    /LOCK_AUTHORITY_INCOMPLETE/,
  )

  const visual = createVisualMutationLockSequence(VISUAL_ONLY_APPROVAL_LOCK_ORDER)
  visual.acquire('image-generation-jobs')
  visual.acquire('products')
  const inverted = createVisualMutationLockSequence(VISUAL_ONLY_APPROVAL_LOCK_ORDER)
  assert.throws(() => inverted.acquire('products'), /LOCK_ORDER_VIOLATION/)

  assert.equal(postgresLocksConflict('row-share', 'share-row-exclusive'), false)
  assert.equal(postgresLocksConflict('row-exclusive', 'share-row-exclusive'), true)
  assert.equal(postgresLocksConflict('share-row-exclusive', 'share-row-exclusive'), true)
  assert.equal(deadlockSchedule(['products', 'image-generation-jobs']), true)
  assert.equal(deadlockSchedule(VISUAL_MUTATION_LOCK_ORDER), false)

  const controlledSource = readFileSync(
    new URL('../../scripts/controlled-fresh-candidate-runtime-resources.ts', import.meta.url),
    'utf8',
  )
  const approvalRuntimeSource = readFileSync(new URL('./visualOnlyApprovalRuntime.ts', import.meta.url), 'utf8')
  const approvalBoundarySource = readFileSync(new URL('./visualOnlyApprovalV01.ts', import.meta.url), 'utf8')
  const provisioningRuntimeSource = readFileSync(new URL('./visualOnlyProvisioningRuntime.ts', import.meta.url), 'utf8')
  const provisioningBoundarySource = readFileSync(new URL('./visualOnlyProvisioning.ts', import.meta.url), 'utf8')
  assert.match(controlledSource, /orderVisualMutationLocks\(lockAuthority\)/)
  assert.match(approvalRuntimeSource, /VISUAL_ONLY_APPROVAL_LOCK_ORDER/)
  assert.ok(approvalBoundarySource.indexOf('adapter.claimJob(') < approvalBoundarySource.indexOf('adapter.lockProduct('))
  assert.match(provisioningRuntimeSource, /VISUAL_ONLY_APPROVAL_LOCK_ORDER/)
  assert.match(provisioningRuntimeSource, /LOCK TABLE \$\{jobTable\} IN SHARE ROW EXCLUSIVE MODE/)
  assert.ok(
    provisioningBoundarySource.indexOf('adapter.lockGenerationHistory(')
      < provisioningBoundarySource.indexOf('adapter.lockProduct('),
  )

  console.log('visualMutationLockOrder: ALL OK')
}

main()
