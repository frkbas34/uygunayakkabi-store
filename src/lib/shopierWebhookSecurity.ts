import crypto from 'node:crypto'

export type ShopierWebhookSignatureFailure =
  | 'missing_configuration'
  | 'missing_signature'
  | 'malformed_signature'
  | 'invalid_signature'

export type ShopierWebhookSignatureVerification =
  | {
    ok: true
    tokenCount: number
  }
  | {
    ok: false
    reason: ShopierWebhookSignatureFailure
    tokenCount: number
  }

function configuredTokens(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((token) => token.trim())
    .filter(Boolean)
}

function constantTimeHexEquals(expected: string, received: string): boolean {
  if (!/^[a-f0-9]{64}$/i.test(received)) return false

  const expectedBytes = Buffer.from(expected, 'hex')
  const receivedBytes = Buffer.from(received, 'hex')

  return expectedBytes.length === receivedBytes.length &&
    crypto.timingSafeEqual(expectedBytes, receivedBytes)
}

/**
 * Verifies the Shopier HMAC format already documented by this project. The
 * exact raw body is signed so JSON whitespace/key-order changes cannot pass.
 */
export function verifyShopierWebhookSignature(args: {
  rawBody: string
  signature: string | null | undefined
  tokenEnv?: string | undefined
}): ShopierWebhookSignatureVerification {
  const tokens = configuredTokens(args.tokenEnv)
  if (tokens.length === 0) {
    return { ok: false, reason: 'missing_configuration', tokenCount: 0 }
  }

  const signature = args.signature?.trim() ?? ''
  if (!signature) {
    return { ok: false, reason: 'missing_signature', tokenCount: tokens.length }
  }
  if (!/^[a-f0-9]{64}$/i.test(signature)) {
    return { ok: false, reason: 'malformed_signature', tokenCount: tokens.length }
  }

  const valid = tokens.some((token) => {
    const expected = crypto.createHmac('sha256', token).update(args.rawBody).digest('hex')
    return constantTimeHexEquals(expected, signature)
  })

  if (!valid) {
    return { ok: false, reason: 'invalid_signature', tokenCount: tokens.length }
  }

  return { ok: true, tokenCount: tokens.length }
}
