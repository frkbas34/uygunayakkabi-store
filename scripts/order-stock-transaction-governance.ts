/**
 * D-484 governance: non-Shopier orders must reserve stock conditionally.
 *
 * Payload's create operation starts a transaction before collection afterChange
 * hooks and commits only after they finish. Keep this repository-level check
 * near the focused hook tests so a framework upgrade cannot silently weaken
 * the order/stock atomicity assumption.
 */
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8')

const orders = read('src/collections/Orders.ts')
const reservation = read('src/lib/orderStockReservation.ts')
const payloadCreate = read('node_modules/payload/dist/collections/operations/create.js')

assert.ok(orders.includes('Cannot decrement stock:'), 'Orders must refuse unresolved or insufficient stock')
assert.ok(!orders.includes('stock decrement failed (non-blocking)'), 'Stock mutation failures must not be swallowed')
assert.ok(orders.includes('collection: \'inventory-logs\''), 'Orders must keep an inventory audit write')
assert.ok(orders.includes('req,'), 'Orders stock operations must retain the parent Payload request')
assert.ok(orders.includes('reserveProductStockForOrder'), 'Orders must reserve aggregate product stock')
assert.ok(orders.includes('reserveVariantStockForOrder'), 'Orders must reserve selected variant stock')
assert.ok(reservation.includes('without an active Payload transaction'), 'Stock reservation must fail closed without a transaction')
assert.ok(reservation.includes('AND COALESCE(${stockColumn}, 0) >= ${quantity}'), 'Stock reservation must enforce stock availability in SQL')
assert.ok(reservation.includes('RETURNING ${table.id}'), 'Stock reservation must detect a conditional update miss')

const transactionStart = payloadCreate.indexOf('await initTransaction(args.req)')
const collectionAfterChange = payloadCreate.indexOf('// afterChange - Collection')
const transactionCommit = payloadCreate.indexOf('await commitTransaction(req)')

assert.ok(transactionStart >= 0, 'Payload create operation must initialize a transaction')
assert.ok(collectionAfterChange >= 0, 'Payload create operation must execute collection afterChange hooks')
assert.ok(transactionCommit >= 0, 'Payload create operation must commit its transaction')
assert.ok(
  transactionStart < collectionAfterChange && collectionAfterChange < transactionCommit,
  'Payload must run collection afterChange hooks inside the create transaction before commit',
)

console.log('order-stock transaction governance: PASS')
