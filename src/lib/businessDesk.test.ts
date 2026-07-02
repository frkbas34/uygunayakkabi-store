/**
 * businessDesk.test.ts - focused D-248 Phase 7 formatter assertions.
 *
 * The data query layer composes existing read-only helpers; this test locks the
 * operator-facing summary behavior without touching Payload.
 */
import assert from 'node:assert'
import { type BusinessSnapshot, formatBusinessSnapshot } from './businessDesk'

let passed = 0

function check(name: string, fn: () => void) {
  try {
    fn()
    passed++
    console.log(`  ok - ${name}`)
  } catch (error) {
    console.error(`  fail - ${name}\n    ${(error as Error).message}`)
    process.exitCode = 1
  }
}

function snapshot(overrides: Partial<BusinessSnapshot> = {}): BusinessSnapshot {
  return {
    leadsNewToday: 0,
    leadsContactedToday: 0,
    leadsWonToday: 0,
    leadsLostToday: 0,
    leadsSpamToday: 0,
    leadsTotalOpen: 0,
    leadsTotalStale: 0,
    leadStaleDays: 3,
    ordersCreatedToday: 0,
    ordersFromLeadsToday: 0,
    revenueToday: 0,
    ordersTotalOpen: 0,
    ordersShippedToday: 0,
    ordersDeliveredToday: 0,
    ordersCancelledToday: 0,
    ordersStaleShipped: 0,
    orderStaleDays: 3,
    stockSoldout: 0,
    stockLowStock: 0,
    ...overrides,
  }
}

check('empty snapshot uses calm-day shortcut', () => {
  const rendered = formatBusinessSnapshot(snapshot())
  assert.ok(rendered.includes('/leads'))
  assert.ok(rendered.includes('/orders'))
  assert.ok(!rendered.includes('az stok'))
})

check('busy snapshot renders demand, sales, operations, and no urgency when clean', () => {
  const rendered = formatBusinessSnapshot(snapshot({
    leadsNewToday: 3,
    leadsContactedToday: 1,
    leadsWonToday: 1,
    ordersCreatedToday: 2,
    ordersFromLeadsToday: 1,
    revenueToday: 4200,
    ordersTotalOpen: 4,
    ordersShippedToday: 1,
    ordersDeliveredToday: 1,
  }))

  assert.ok(rendered.includes('Yeni lead: 3'))
  assert.ok(rendered.includes('Sipari'))
  assert.ok(rendered.includes('4200'))
  assert.ok(!rendered.includes('bayat lead'))
  assert.ok(!rendered.includes('az stok'))
})

check('urgency snapshot renders stale lead, stale order, soldout, and low-stock signals', () => {
  const rendered = formatBusinessSnapshot(snapshot({
    leadsTotalOpen: 5,
    leadsTotalStale: 2,
    ordersTotalOpen: 3,
    ordersStaleShipped: 1,
    stockSoldout: 4,
    stockLowStock: 6,
  }))

  assert.ok(rendered.includes('bayat lead'))
  assert.ok(rendered.includes('ge'))
  assert.ok(rendered.includes('stok'))
  assert.ok(rendered.includes('6'))
})

console.log(`\nbusinessDesk: ${passed} checks passed${process.exitCode ? ' - WITH FAILURES' : ' - ALL OK'}`)
if (process.exitCode) process.exit(process.exitCode)
