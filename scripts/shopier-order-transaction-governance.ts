import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

function read(filePath: string): string {
  assert.ok(existsSync(filePath), `missing required file: ${filePath}`)
  return readFileSync(filePath, 'utf8')
}

function assertIncludes(source: string, needle: string, label: string): void {
  assert.ok(source.includes(needle), `${label} must include: ${needle}`)
}

const route = read('src/app/api/webhooks/shopier/route.ts')
const orders = read('src/collections/Orders.ts')
const shopierStock = read('src/lib/shopierOrderStock.ts')
const stockReservation = read('src/lib/orderStockReservation.ts')
const packageJson = JSON.parse(read('package.json')) as { scripts?: Record<string, string> }

assertIncludes(route, "import { runPayloadTransaction } from '@/lib/payloadTransaction'", 'Shopier webhook route')

const transactionStart = route.indexOf('const stockMutation = await runPayloadTransaction(payload')
const transactionEnd = route.indexOf('\n    for (const skipped of stockMutation.skippedItems)', transactionStart)
assert.ok(transactionStart >= 0, 'order.created must open a Payload transaction before creating the order')
assert.ok(transactionEnd > transactionStart, 'order.created transaction must finish before stock diagnostics')
const transaction = route.slice(transactionStart, transactionEnd)

assertIncludes(transaction, "collection: 'orders'", 'transactional order create')
assertIncludes(transaction, 'req,', 'transactional Payload operations')
assertIncludes(transaction, 'await decrementStockForShopierOrder(', 'transactional stock decrement')
assertIncludes(transaction, '{ req },', 'transactional stock decrement')
assertIncludes(shopierStock, 'decrementProductStockAtFloor', 'Shopier stock decrement')
assertIncludes(shopierStock, 'decrementVariantStockAtFloor', 'Shopier variant stock decrement')
assertIncludes(stockReservation, 'GREATEST(COALESCE(${stockColumn}, 0) - ${quantity}, 0)', 'Shopier atomic floor-at-zero decrement')
assertIncludes(stockReservation, 'Cannot reserve stock without an active Payload transaction.', 'Shopier transaction requirement')

const createdHandlerStart = route.indexOf('async function handleOrderCreated')
const createdHandlerEnd = route.indexOf('async function handleOrderFulfilled', createdHandlerStart)
const createdHandler = route.slice(createdHandlerStart, createdHandlerEnd)
assertIncludes(createdHandler, 'isPostgresUniqueViolation(err)', 'duplicate Shopier order handler')
assertIncludes(createdHandler, 'stock mutation skipped', 'duplicate Shopier order handler')

const postCatchStart = route.lastIndexOf('  } catch (err) {', createdHandlerStart)
const postCatchEnd = route.indexOf('\n}\n\n//', postCatchStart)
assert.ok(postCatchStart >= 0 && postCatchEnd > postCatchStart, 'webhook POST must have a top-level error response')
const postCatch = route.slice(postCatchStart, postCatchEnd)
assertIncludes(postCatch, "return NextResponse.json({ ok: false, error: 'Webhook processing failed' }, { status: 500 })", 'retry response')

const orderAlertHookStart = orders.indexOf("const source = (doc as any).source")
const orderAlertHookEnd = orders.indexOf('return doc', orderAlertHookStart)
const orderAlertHook = orders.slice(orderAlertHookStart, orderAlertHookEnd)
assertIncludes(orderAlertHook, "source === 'telegram' || source === 'shopier'", 'generic order alert hook')

assertIncludes(packageJson.scripts?.['test:payload-transaction'] ?? '', 'payloadTransaction.test.ts', 'transaction helper test')
assertIncludes(packageJson.scripts?.['test:shopier-order-transaction'] ?? '', 'shopier-order-transaction-governance.ts', 'transaction governance test')
assertIncludes(packageJson.scripts?.['test:shopier-webhook-local'] ?? '', 'test:shopier-order-transaction', 'local webhook suite')
assertIncludes(packageJson.scripts?.['pretest:safe'] ?? '', 'test:shopier-order-transaction', 'safe-suite preflight')

console.log('shopierOrderTransactionGovernance: ALL OK')
