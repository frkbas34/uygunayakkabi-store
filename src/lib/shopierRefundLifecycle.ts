/**
 * Shopier refund lifecycle helpers.
 *
 * `refund.requested` is the channel signal that cancels the order and restores
 * stock. `refund.updated` is traceability only: append the latest Shopier
 * refund status to the local order notes and emit an audit event without
 * changing order status or stock a second time.
 */

export const SHOPIER_REFUND_UPDATED_EVENT = 'order.refund_updated'
export const SHOPIER_REFUND_REQUESTED_EVENT = 'order.refund_requested'

export interface ShopierRefundLifecyclePayload {
  find(args: {
    collection: 'orders'
    where: Record<string, unknown>
    limit?: number
    depth?: number
  }): Promise<{ docs: Array<Record<string, unknown>> }>
  update(args: {
    collection: 'orders'
    id: number | string
    data: Record<string, unknown>
    context?: Record<string, unknown>
  }): Promise<unknown>
  create?(args: {
    collection: 'bot-events'
    data: Record<string, unknown>
  }): Promise<unknown>
}

export interface ShopierRefundUpdateInfo {
  refundId: string
  orderId: string
  status: string
}

export interface ShopierRefundRequestInfo {
  refundId: string
  orderId: string
}

export type ShopierRefundUpdateOutcome =
  | 'updated'
  | 'idempotent'
  | 'missing_order_id'
  | 'order_not_found'

export interface ShopierRefundUpdateResult {
  outcome: ShopierRefundUpdateOutcome
  info: ShopierRefundUpdateInfo
  orderId?: number | string
  wroteOrder: boolean
  wroteEvent: boolean
  noteLine: string
  message: string
}

export type ShopierRefundRequestOutcome =
  | 'updated'
  | 'idempotent'
  | 'missing_order_id'
  | 'order_not_found'

export interface ShopierRefundRequestResult {
  outcome: ShopierRefundRequestOutcome
  info: ShopierRefundRequestInfo
  orderId?: number | string
  order?: Record<string, unknown>
  wroteOrder: boolean
  wroteEvent: boolean
  noteLine: string
  shouldRestoreStock: boolean
  message: string
}

function asCleanString(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return ''
}

function firstCleanString(...values: unknown[]): string {
  for (const value of values) {
    const clean = asCleanString(value)
    if (clean) return clean
  }
  return ''
}

export function extractShopierRefundUpdateInfo(
  body: Record<string, unknown>,
): ShopierRefundUpdateInfo {
  const order = body.order && typeof body.order === 'object'
    ? body.order as Record<string, unknown>
    : {}

  return {
    refundId: firstCleanString(body.id, body.refundId, body.refund_id) || '?',
    orderId: firstCleanString(
      body.orderId,
      body.order_id,
      body.shopierOrderId,
      order.id,
      order.orderId,
      order.order_id,
      order.shopierOrderId,
    ),
    status: firstCleanString(body.status, body.refundStatus, body.refund_status) || 'unknown',
  }
}

export function extractShopierRefundRequestInfo(
  body: Record<string, unknown>,
): ShopierRefundRequestInfo {
  const updateInfo = extractShopierRefundUpdateInfo(body)
  return {
    refundId: updateInfo.refundId,
    orderId: updateInfo.orderId,
  }
}

export function buildShopierRefundUpdateNoteLine(info: ShopierRefundUpdateInfo): string {
  return `Shopier refund update: refund=${info.refundId} status=${info.status}`
}

export function buildShopierRefundRequestNoteLine(info: ShopierRefundRequestInfo): string {
  return `Shopier refund requested: refund=${info.refundId}`
}

function appendUniqueNote(currentNotes: unknown, noteLine: string): { notes: string; changed: boolean } {
  const current = typeof currentNotes === 'string' ? currentNotes.trim() : ''
  if (current.includes(noteLine)) {
    return { notes: current, changed: false }
  }
  return {
    notes: current ? `${current}\n\n${noteLine}` : noteLine,
    changed: true,
  }
}

function hasRefundRequestMarker(currentNotes: unknown, info: ShopierRefundRequestInfo): boolean {
  const current = typeof currentNotes === 'string' ? currentNotes : ''
  return current.includes(buildShopierRefundRequestNoteLine(info)) ||
    current.includes(`Iade talebi: ${info.refundId}`) ||
    current.includes(`\u0130ade talebi: ${info.refundId}`)
}

export async function applyShopierRefundRequest(
  payload: ShopierRefundLifecyclePayload,
  body: Record<string, unknown>,
): Promise<ShopierRefundRequestResult> {
  const info = extractShopierRefundRequestInfo(body)
  const noteLine = buildShopierRefundRequestNoteLine(info)

  if (!info.orderId) {
    return {
      outcome: 'missing_order_id',
      info,
      wroteOrder: false,
      wroteEvent: false,
      noteLine,
      shouldRestoreStock: false,
      message: `Shopier refund ${info.refundId} has no order id; no local order update.`,
    }
  }

  const existing = await payload.find({
    collection: 'orders',
    where: { shopierOrderId: { equals: info.orderId } },
    limit: 1,
    depth: 0,
  })

  const order = existing.docs[0]
  if (!order) {
    return {
      outcome: 'order_not_found',
      info,
      wroteOrder: false,
      wroteEvent: false,
      noteLine,
      shouldRestoreStock: false,
      message: `No local order found for Shopier order ${info.orderId}.`,
    }
  }

  const orderId = order.id as number | string
  const alreadyRecorded = hasRefundRequestMarker(order.notes, info)
  const alreadyCancelled = order.status === 'cancelled'
  if (alreadyRecorded && alreadyCancelled) {
    return {
      outcome: 'idempotent',
      info,
      orderId,
      order,
      wroteOrder: false,
      wroteEvent: false,
      noteLine,
      shouldRestoreStock: false,
      message: `Shopier refund ${info.refundId} was already requested for local order ${orderId}.`,
    }
  }

  const notes = appendUniqueNote(order.notes, noteLine)
  await payload.update({
    collection: 'orders',
    id: orderId,
    data: {
      status: 'cancelled',
      notes: notes.notes,
    },
    context: { isDispatchUpdate: true },
  })

  let wroteEvent = false
  if (payload.create) {
    try {
      await payload.create({
        collection: 'bot-events',
        data: {
          eventType: SHOPIER_REFUND_REQUESTED_EVENT,
          sourceBot: 'shopier_webhook',
          status: 'processed',
          payload: {
            orderId,
            shopierOrderId: info.orderId,
            refundId: info.refundId,
            previousStatus: order.status ?? null,
            toStatus: 'cancelled',
            shouldRestoreStock: !alreadyRecorded,
          },
          notes: `Shopier refund ${info.refundId} requested for order ${orderId}.`,
          processedAt: new Date().toISOString(),
        },
      })
      wroteEvent = true
    } catch {
      wroteEvent = false
    }
  }

  return {
    outcome: 'updated',
    info,
    orderId,
    order,
    wroteOrder: true,
    wroteEvent,
    noteLine,
    shouldRestoreStock: !alreadyRecorded,
    message: `Shopier refund ${info.refundId} request recorded on local order ${orderId}.`,
  }
}

export async function applyShopierRefundUpdate(
  payload: ShopierRefundLifecyclePayload,
  body: Record<string, unknown>,
): Promise<ShopierRefundUpdateResult> {
  const info = extractShopierRefundUpdateInfo(body)
  const noteLine = buildShopierRefundUpdateNoteLine(info)

  if (!info.orderId) {
    return {
      outcome: 'missing_order_id',
      info,
      wroteOrder: false,
      wroteEvent: false,
      noteLine,
      message: `Shopier refund ${info.refundId} has no order id; no local order update.`,
    }
  }

  const existing = await payload.find({
    collection: 'orders',
    where: { shopierOrderId: { equals: info.orderId } },
    limit: 1,
    depth: 0,
  })

  const order = existing.docs[0]
  if (!order) {
    return {
      outcome: 'order_not_found',
      info,
      wroteOrder: false,
      wroteEvent: false,
      noteLine,
      message: `No local order found for Shopier order ${info.orderId}.`,
    }
  }

  const orderId = order.id as number | string
  const notes = appendUniqueNote(order.notes, noteLine)
  if (!notes.changed) {
    return {
      outcome: 'idempotent',
      info,
      orderId,
      wroteOrder: false,
      wroteEvent: false,
      noteLine,
      message: `Shopier refund ${info.refundId} status ${info.status} already recorded.`,
    }
  }

  await payload.update({
    collection: 'orders',
    id: orderId,
    data: { notes: notes.notes },
    context: { isDispatchUpdate: true },
  })

  let wroteEvent = false
  if (payload.create) {
    try {
      await payload.create({
        collection: 'bot-events',
        data: {
          eventType: SHOPIER_REFUND_UPDATED_EVENT,
          sourceBot: 'shopier_webhook',
          status: 'processed',
          payload: {
            orderId,
            shopierOrderId: info.orderId,
            refundId: info.refundId,
            refundStatus: info.status,
          },
          notes: `Shopier refund ${info.refundId} updated to ${info.status}.`,
          processedAt: new Date().toISOString(),
        },
      })
      wroteEvent = true
    } catch {
      wroteEvent = false
    }
  }

  return {
    outcome: 'updated',
    info,
    orderId,
    wroteOrder: true,
    wroteEvent,
    noteLine,
    message: `Shopier refund ${info.refundId} status ${info.status} recorded on local order ${orderId}.`,
  }
}
