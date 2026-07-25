import { sql } from 'drizzle-orm'
import type { Payload, PayloadRequest } from 'payload'

type AtomicTransaction = {
  execute(statement: unknown): Promise<unknown>
}

type StockTable = Record<string, unknown>

type PostgresPayloadAdapter = {
  sessions?: Record<string, { db?: AtomicTransaction }>
  tables?: Record<string, StockTable | undefined>
}

type StockColumn = 'stockQuantity' | 'stock'
type StockTableName = 'products' | 'variants'

function rowsFrom(result: unknown): unknown[] {
  if (Array.isArray(result)) return result
  if (typeof result !== 'object' || result === null) return []

  const rows = (result as { rows?: unknown }).rows
  return Array.isArray(rows) ? rows : []
}

async function getActiveTransaction(
  payload: Payload,
  req: Partial<PayloadRequest> | undefined,
): Promise<{ db: AtomicTransaction; tables: Record<string, StockTable | undefined> }> {
  const transactionID = await req?.transactionID
  if (!transactionID) {
    throw new Error('Cannot reserve stock without an active Payload transaction.')
  }

  const adapter = payload.db as unknown as PostgresPayloadAdapter
  const db = adapter.sessions?.[String(transactionID)]?.db
  if (!db) {
    throw new Error('Cannot reserve stock: the active Payload transaction is unavailable.')
  }

  if (!adapter.tables) {
    throw new Error('Cannot reserve stock: the PostgreSQL schema tables are unavailable.')
  }

  return { db, tables: adapter.tables }
}

function getStockTable(
  tables: Record<string, StockTable | undefined>,
  tableName: StockTableName,
  stockColumn: StockColumn,
): StockTable {
  const table = tables[tableName]
  if (!table?.id || !table[stockColumn] || !table.updatedAt) {
    throw new Error(`Cannot reserve stock: ${tableName} PostgreSQL schema is incomplete.`)
  }

  return table
}

async function reserveStock(
  payload: Payload,
  req: Partial<PayloadRequest> | undefined,
  args: {
    id: string | number
    quantity: number
    stockColumn: StockColumn
    tableName: StockTableName
  },
): Promise<boolean> {
  if (!Number.isFinite(args.quantity) || args.quantity <= 0) {
    throw new Error('Cannot reserve stock with a non-positive quantity.')
  }

  const { db, tables } = await getActiveTransaction(payload, req)
  const table = getStockTable(tables, args.tableName, args.stockColumn)
  const quantity = args.quantity
  const stockColumn = table[args.stockColumn]

  // The threshold lives in SQL, so concurrent creates cannot overwrite the same final unit.
  const result = await db.execute(sql`
    UPDATE ${table}
    SET ${stockColumn} = ${stockColumn} - ${quantity},
        ${table.updatedAt} = CURRENT_TIMESTAMP
    WHERE ${table.id} = ${args.id}
      AND COALESCE(${stockColumn}, 0) >= ${quantity}
    RETURNING ${table.id}
  `)

  return rowsFrom(result).length > 0
}

async function decrementStockAtFloor(
  payload: Payload,
  req: Partial<PayloadRequest> | undefined,
  args: {
    id: string | number
    quantity: number
    stockColumn: StockColumn
    tableName: StockTableName
  },
): Promise<boolean> {
  if (!Number.isFinite(args.quantity) || args.quantity <= 0) {
    throw new Error('Cannot decrement stock with a non-positive quantity.')
  }

  const { db, tables } = await getActiveTransaction(payload, req)
  const table = getStockTable(tables, args.tableName, args.stockColumn)
  const quantity = args.quantity
  const stockColumn = table[args.stockColumn]

  // External Shopier sales are already paid. Clamp at zero, but keep the
  // arithmetic in one UPDATE so concurrent deliveries cannot lose depletion.
  const result = await db.execute(sql`
    UPDATE ${table}
    SET ${stockColumn} = GREATEST(COALESCE(${stockColumn}, 0) - ${quantity}, 0),
        ${table.updatedAt} = CURRENT_TIMESTAMP
    WHERE ${table.id} = ${args.id}
    RETURNING ${table.id}
  `)

  return rowsFrom(result).length > 0
}

/**
 * Atomically reserves product-level stock for an order inside the parent
 * Payload transaction. A false return means the requested stock was gone.
 */
export function reserveProductStockForOrder(
  payload: Payload,
  productId: string | number,
  quantity: number,
  req: Partial<PayloadRequest> | undefined,
): Promise<boolean> {
  return reserveStock(payload, req, {
    id: productId,
    quantity,
    stockColumn: 'stockQuantity',
    tableName: 'products',
  })
}

/**
 * Atomically reserves one selected size variant for an order. Product-level
 * stock is reserved first by the caller so the aggregate remains in sync.
 */
export function reserveVariantStockForOrder(
  payload: Payload,
  variantId: string | number,
  quantity: number,
  req: Partial<PayloadRequest> | undefined,
): Promise<boolean> {
  return reserveStock(payload, req, {
    id: variantId,
    quantity,
    stockColumn: 'stock',
    tableName: 'variants',
  })
}

/**
 * Records a paid external sale without allowing local stock below zero. This
 * must run in a Payload transaction, but intentionally does not reject a sale
 * when the local catalog is already depleted.
 */
export function decrementProductStockAtFloor(
  payload: Payload,
  productId: string | number,
  quantity: number,
  req: Partial<PayloadRequest> | undefined,
): Promise<boolean> {
  return decrementStockAtFloor(payload, req, {
    id: productId,
    quantity,
    stockColumn: 'stockQuantity',
    tableName: 'products',
  })
}

export function decrementVariantStockAtFloor(
  payload: Payload,
  variantId: string | number,
  quantity: number,
  req: Partial<PayloadRequest> | undefined,
): Promise<boolean> {
  return decrementStockAtFloor(payload, req, {
    id: variantId,
    quantity,
    stockColumn: 'stock',
    tableName: 'variants',
  })
}
