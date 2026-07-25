import {
  commitTransaction,
  createLocalReq,
  initTransaction,
  killTransaction,
  type Payload,
  type PayloadRequest,
} from 'payload'

export type PayloadTransactionRuntime = {
  begin: (req: PayloadRequest) => Promise<boolean>
  commit: (req: PayloadRequest) => Promise<void>
  createRequest: () => Promise<PayloadRequest>
  rollback: (req: PayloadRequest) => Promise<void>
}

export function createPayloadTransactionRuntime(payload: Payload): PayloadTransactionRuntime {
  return {
    begin: initTransaction,
    commit: commitTransaction,
    createRequest: () => createLocalReq({}, payload),
    rollback: killTransaction,
  }
}

/**
 * Runs a group of local Payload operations in one adapter transaction.
 * This is intentionally fail-closed: UygunAyakkabi uses PostgreSQL, and a
 * non-transactional fallback would make stock reconciliation unsafe.
 */
export async function executePayloadTransaction<T>(
  runtime: PayloadTransactionRuntime,
  operation: (req: PayloadRequest) => Promise<T>,
): Promise<T> {
  const req = await runtime.createRequest()
  const ownsTransaction = await runtime.begin(req)

  if (!ownsTransaction) {
    throw new Error('Payload transaction unavailable for an atomic commerce operation.')
  }

  try {
    const result = await operation(req)
    await runtime.commit(req)
    return result
  } catch (error) {
    await runtime.rollback(req)
    throw error
  }
}

export function runPayloadTransaction<T>(
  payload: Payload,
  operation: (req: PayloadRequest) => Promise<T>,
): Promise<T> {
  return executePayloadTransaction(createPayloadTransactionRuntime(payload), operation)
}
