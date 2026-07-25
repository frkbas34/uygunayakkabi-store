import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

function read(filePath: string): string {
  assert.ok(existsSync(filePath), `missing required file: ${filePath}`)
  return readFileSync(filePath, 'utf8')
}

function assertIncludes(source: string, needle: string, label: string): void {
  assert.ok(source.includes(needle), `${label} must include: ${needle}`)
}

const orders = read('src/collections/Orders.ts')
const route = read('src/app/api/webhooks/shopier/route.ts')
const helper = read('src/lib/shopierOrderIdempotency.ts')
const schemaCheck = read('scripts/shopier-order-id-schema-check.ts')
const schemaApply = read('scripts/shopier-order-id-schema-apply.ts')
const sql = read('scripts/sql/d481-shopier-order-id-unique.sql')
const packageJson = JSON.parse(read('package.json')) as { scripts?: Record<string, string> }

assertIncludes(orders, "name: 'shopierOrderId'", 'Orders collection')
const orderIdField = orders.slice(orders.indexOf("name: 'shopierOrderId'"), orders.indexOf("name: 'paymentMethod'"))
assertIncludes(orderIdField, 'unique: true', 'Shopier order ID field')

assertIncludes(helper, "candidate.code === '23505'", 'unique-violation helper')
assertIncludes(helper, 'candidate.cause?.code === \'23505\'', 'unique-violation helper')
assertIncludes(route, 'isPostgresUniqueViolation', 'Shopier webhook route')
assertIncludes(route, 'runPayloadTransaction(payload', 'transactional order create handler')

const createStart = route.indexOf('await payload.create(')
assert.ok(createStart >= 0, 'Shopier webhook route must create orders through Payload')
const createEnd = route.indexOf('const stockMutation = await decrementStockForShopierOrder', createStart)
assert.ok(createEnd > createStart, 'Shopier webhook route must handle the create before stock mutation')
const orderHandlerEnd = route.indexOf('async function handleOrderFulfilled', createStart)
const orderHandler = route.slice(createStart, orderHandlerEnd)
assertIncludes(orderHandler, 'isPostgresUniqueViolation(err)', 'order create conflict handler')
assertIncludes(orderHandler, 'stock mutation skipped', 'order create conflict handler')

assertIncludes(sql, 'CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS orders_shopier_order_id_unique_idx', 'D-481 SQL')
assertIncludes(sql, 'ON public.orders (shopier_order_id)', 'D-481 SQL')
assertIncludes(sql, "WHERE shopier_order_id IS NOT NULL AND btrim(shopier_order_id) <> ''", 'D-481 SQL')

for (const needle of ['--confirm-read-only', 'READ_ONLY', 'mutationRequested', 'Refusing to', 'information_schema', 'pg_indexes', 'does not run DDL']) {
  assertIncludes(schemaCheck, needle, 'read-only schema check')
}
assertIncludes(schemaApply, '--confirm-apply-d481-shopier-order-id-unique', 'guarded apply helper')
assertIncludes(schemaApply, 'No database connection was opened and no DDL was run.', 'guarded apply helper')
assertIncludes(schemaApply, 'CREATE INDEX CONCURRENTLY', 'guarded apply helper')
assertIncludes(schemaApply, 'duplicate non-empty Shopier order IDs', 'guarded apply helper')

assertIncludes(packageJson.scripts?.['test:shopier-order-id-unique'] ?? '', 'shopierOrderIdempotency.test.ts', 'package test script')
assertIncludes(packageJson.scripts?.['pretest:safe'] ?? '', 'npm run test:shopier-order-id-unique', 'safe-suite preflight')
assertIncludes(packageJson.scripts?.['smoke:shopier-order-id-schema:read'] ?? '', 'shopier-order-id-schema-check.ts', 'package read-only smoke')
assertIncludes(packageJson.scripts?.['db:shopier-order-id-unique:apply'] ?? '', 'shopier-order-id-schema-apply.ts', 'package apply helper')

console.log('shopierOrderIdSchemaGovernance: ALL OK')
