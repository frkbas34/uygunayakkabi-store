import { parseAllowedUserIds } from './telegramAccess'
import type { VisualOnlyV01ExecutionResult } from './visualOnlyApprovalV01'

type RecordValue = Record<string, unknown>

export type VisualOnlyCallbackRouteInput = {
  callbackQueryId: unknown
  data: unknown
  chatId: unknown
  chatType: unknown
  userId: unknown
  botRole: 'uygunops' | 'geo'
  expectedWebhookSecret: unknown
  providedWebhookSecret: unknown
}

export type VisualOnlyCallbackRouteDependencies = {
  loadAutomationSettings(): Promise<unknown>
  executeDecision(callback: { data: string; chatId: number; userId: number }): Promise<VisualOnlyV01ExecutionResult>
  acknowledge(result: VisualOnlyV01ExecutionResult): Promise<void>
  notify(result: VisualOnlyV01ExecutionResult): Promise<void>
}

export class VisualOnlyCallbackAuthorizationError extends Error {
  readonly code: string

  constructor(code: string) {
    super(code)
    this.code = code
  }
}

function isRecord(value: unknown): value is RecordValue {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function positiveInteger(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : null
}

function reject(code: string): never {
  throw new VisualOnlyCallbackAuthorizationError(code)
}

/**
 * Production callback ordering boundary. Current webhook/operator authority and
 * the complete persisted visual identity are proven before claim, mutation, or
 * Telegram acknowledgement. The injected operations are the route's real
 * Payload/Telegram adapters; tests replace them with zero-side-effect spies.
 */
export async function executeAuthorizedVisualOnlyCallback(
  input: VisualOnlyCallbackRouteInput,
  dependencies: VisualOnlyCallbackRouteDependencies,
): Promise<VisualOnlyV01ExecutionResult> {
  const expectedSecret = typeof input.expectedWebhookSecret === 'string'
    ? input.expectedWebhookSecret
    : ''
  if (!expectedSecret.trim()) reject('VISUAL_ONLY_WEBHOOK_SECRET_REQUIRED')
  if (typeof input.providedWebhookSecret !== 'string' || input.providedWebhookSecret !== expectedSecret) {
    reject('VISUAL_ONLY_WEBHOOK_SECRET_INVALID')
  }
  if (input.botRole !== 'uygunops' || input.chatType !== 'private') {
    reject('VISUAL_ONLY_PRIVATE_UYGUNOPS_CHAT_REQUIRED')
  }
  const callbackQueryId = typeof input.callbackQueryId === 'string' && input.callbackQueryId.trim()
    ? input.callbackQueryId.trim()
    : null
  const data = typeof input.data === 'string' && /^(?:voa|vor):/.test(input.data) ? input.data : null
  const chatId = positiveInteger(input.chatId)
  const userId = positiveInteger(input.userId)
  if (!callbackQueryId || !data || !chatId || !userId) reject('VISUAL_ONLY_CALLBACK_REQUEST_IDENTITY_MISSING')

  let settings: unknown
  try {
    settings = await dependencies.loadAutomationSettings()
  } catch {
    reject('VISUAL_ONLY_OPERATOR_AUTHORITY_UNAVAILABLE')
  }
  if (!isRecord(settings) || !isRecord(settings.telegram)) {
    reject('VISUAL_ONLY_OPERATOR_AUTHORITY_MALFORMED')
  }
  const allowedRaw = settings.telegram.allowedUserIds
  if (typeof allowedRaw !== 'string') reject('VISUAL_ONLY_OPERATOR_ALLOWLIST_MISSING')
  const allowedIds = parseAllowedUserIds(allowedRaw)
  if (allowedIds.length === 0) reject('VISUAL_ONLY_OPERATOR_ALLOWLIST_EMPTY')
  if (!allowedIds.includes(String(userId))) reject('VISUAL_ONLY_OPERATOR_NOT_CURRENTLY_AUTHORIZED')

  const result = await dependencies.executeDecision({ data, chatId, userId })
  await dependencies.acknowledge(result)
  await dependencies.notify(result)
  return result
}
