import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import type { NextRequest } from 'next/server'

type EffectCounters = {
  bodyParses: number
  provisioningCalls: number
  payloadCreates: number
  productUpdates: number
  imageJobUpdates: number
  queueCalls: number
  acknowledgements: number
  telegramNotifications: number
  runners: number
  providerEligibility: number
  downstreamCalls: number
  networkCalls: number
}

const FORGED_ALLOWLISTED_VISUAL_UPDATE = {
  update_id: 880077,
  message: {
    message_id: 61,
    from: { id: 7700, is_bot: false, first_name: 'Forged Operator' },
    chat: { id: 7700, type: 'private', username: 'forged_operator' },
    date: 1_788_000_000,
    text: '#gorsel 77 --stock=SN0077 --profile=visual-lock-v0.1 --family=generic --mode=visual-only-v0.1 --owner-confirm=OWNER_CONFIRMED_VISUAL_ONLY_V0_1',
  },
}

function counters(): EffectCounters {
  return {
    bodyParses: 0,
    provisioningCalls: 0,
    payloadCreates: 0,
    productUpdates: 0,
    imageJobUpdates: 0,
    queueCalls: 0,
    acknowledgements: 0,
    telegramNotifications: 0,
    runners: 0,
    providerEligibility: 0,
    downstreamCalls: 0,
    networkCalls: 0,
  }
}

function routeRequest(params: {
  calls: EffectCounters
  header?: string
  update?: unknown
}): NextRequest {
  const headers = new Headers({ 'content-type': 'application/json' })
  if (params.header !== undefined) {
    headers.set('X-Telegram-Bot-Api-Secret-Token', params.header)
  }
  return {
    url: 'http://localhost/api/telegram',
    headers,
    json: async () => {
      params.calls.bodyParses += 1
      return structuredClone(params.update ?? FORGED_ALLOWLISTED_VISUAL_UPDATE)
    },
  } as NextRequest
}

function assertZeroSideEffects(calls: EffectCounters): void {
  assert.deepEqual(calls, {
    bodyParses: 0,
    provisioningCalls: 0,
    payloadCreates: 0,
    productUpdates: 0,
    imageJobUpdates: 0,
    queueCalls: 0,
    acknowledgements: 0,
    telegramNotifications: 0,
    runners: 0,
    providerEligibility: 0,
    downstreamCalls: 0,
    networkCalls: 0,
  })
}

async function main(): Promise<void> {
  process.env.PAYLOAD_DB_PUSH = 'false'
  delete process.env.TELEGRAM_BOT_TOKEN
  delete process.env.TELEGRAM_GEO_BOT_TOKEN
  delete process.env.TELEGRAM_GEO_WEBHOOK_SECRET

  const [{ POST, hasConfiguredExactTelegramWebhookSecret }, { parseVisualLockCommand }] = await Promise.all([
    import('../app/api/telegram/route'),
    import('./imageVisualLockV01'),
  ])

  const forgedCommand = parseVisualLockCommand({
    text: FORGED_ALLOWLISTED_VISUAL_UPDATE.message.text,
    chatType: FORGED_ALLOWLISTED_VISUAL_UPDATE.message.chat.type,
    botRole: 'uygunops',
    dmAccessReason: 'allowlisted',
  })
  assert.equal(forgedCommand.kind, 'accepted')
  if (forgedCommand.kind === 'accepted') {
    assert.equal(forgedCommand.productId, 77)
    assert.equal(forgedCommand.stockNumber, 'SN0077')
    assert.equal(forgedCommand.family, 'generic')
    assert.equal(forgedCommand.executionMode, 'visual-only-v0.1')
    assert.equal(forgedCommand.ownerConfirmation, 'OWNER_CONFIRMED_VISUAL_ONLY_V0_1')
  }

  let activeCalls: EffectCounters | null = null
  globalThis.fetch = async () => {
    if (activeCalls) {
      activeCalls.networkCalls += 1
      activeCalls.downstreamCalls += 1
    }
    throw new Error('TEST_EXTERNAL_NETWORK_FORBIDDEN')
  }

  const invalidCases: Array<{
    name: string
    configureExpected: () => void
    header?: string
  }> = [
    {
      name: 'expected secret missing',
      configureExpected: () => { delete process.env.TELEGRAM_WEBHOOK_SECRET },
    },
    {
      name: 'expected secret empty',
      configureExpected: () => { process.env.TELEGRAM_WEBHOOK_SECRET = '' },
    },
    {
      name: 'expected secret whitespace-only',
      configureExpected: () => { process.env.TELEGRAM_WEBHOOK_SECRET = '   ' },
    },
    {
      name: 'request secret missing',
      configureExpected: () => { process.env.TELEGRAM_WEBHOOK_SECRET = 'configured-test-value' },
    },
    {
      name: 'request secret blank',
      configureExpected: () => { process.env.TELEGRAM_WEBHOOK_SECRET = 'configured-test-value' },
      header: '',
    },
    {
      name: 'request secret whitespace-only',
      configureExpected: () => { process.env.TELEGRAM_WEBHOOK_SECRET = 'configured-test-value' },
      header: '   ',
    },
    {
      name: 'request secret incorrect',
      configureExpected: () => { process.env.TELEGRAM_WEBHOOK_SECRET = 'configured-test-value' },
      header: 'incorrect-test-value',
    },
    {
      name: 'forged allowlisted identity cannot bypass the secret',
      configureExpected: () => { process.env.TELEGRAM_WEBHOOK_SECRET = 'configured-test-value' },
      header: 'forged-test-value',
    },
  ]

  for (const testCase of invalidCases) {
    testCase.configureExpected()
    const calls = counters()
    activeCalls = calls
    const response = await POST(routeRequest({ calls, header: testCase.header }))
    assert.equal(response.status, 401, testCase.name)
    const publicBody = await response.json()
    assert.deepEqual(publicBody, { error: 'Unauthorized' }, testCase.name)
    const serialized = JSON.stringify(publicBody)
    assert.doesNotMatch(serialized, /configured-test-value|incorrect-test-value|forged-test-value|7700|880077|SN0077/)
    assertZeroSideEffects(calls)
  }

  assert.equal(hasConfiguredExactTelegramWebhookSecret(undefined, undefined), false)
  assert.equal(hasConfiguredExactTelegramWebhookSecret('', ''), false)
  assert.equal(hasConfiguredExactTelegramWebhookSecret('   ', '   '), false)
  assert.equal(hasConfiguredExactTelegramWebhookSecret('configured-test-value', null), false)
  assert.equal(hasConfiguredExactTelegramWebhookSecret('configured-test-value', ''), false)
  assert.equal(hasConfiguredExactTelegramWebhookSecret('configured-test-value', 'incorrect-test-value'), false)
  assert.equal(hasConfiguredExactTelegramWebhookSecret(' configured-test-value ', ' configured-test-value '), true)
  assert.equal(hasConfiguredExactTelegramWebhookSecret('configured-test-value', 'configured-test-value'), true)

  process.env.TELEGRAM_WEBHOOK_SECRET = 'configured-test-value'
  const validCalls = counters()
  activeCalls = validCalls
  const validResponse = await POST(routeRequest({
    calls: validCalls,
    header: 'configured-test-value',
    update: { update_id: 880078 },
  }))
  assert.equal(validResponse.status, 200)
  assert.deepEqual(await validResponse.json(), { ok: true })
  assert.equal(validCalls.bodyParses, 1)
  assert.equal(validCalls.networkCalls, 0)
  assert.equal(validCalls.downstreamCalls, 0)

  const routeSource = readFileSync(new URL('../app/api/telegram/route.ts', import.meta.url), 'utf8')
  const handler = routeSource.slice(routeSource.indexOf('export async function POST'))
  const gateIndex = handler.indexOf('if (!hasConfiguredExactTelegramWebhookSecret')
  const tokenIndex = handler.indexOf('const resolvedToken')
  const bodyIndex = handler.indexOf('const body = await req.json()')
  const callbackIndex = handler.indexOf('const callbackQuery = body?.callback_query')
  const messageIndex = handler.indexOf('const message = body?.message')
  const payloadIndex = handler.indexOf('const payload = await getPayload()')
  const parserIndex = handler.indexOf('const visualLockCommand = parseVisualLockCommand')
  const provisioningIndex = handler.indexOf('const result = await provisionVisualOnlyV01')
  assert.ok(gateIndex >= 0)
  for (const laterIndex of [
    tokenIndex,
    bodyIndex,
    callbackIndex,
    messageIndex,
    payloadIndex,
    parserIndex,
    provisioningIndex,
  ]) assert.ok(gateIndex < laterIndex)
  assert.doesNotMatch(handler, /signature verification is DISABLED|TELEGRAM_WEBHOOK_SECRET boşsa atla/)
  assert.match(handler, /expectedWebhookSecret: expectedSecret/)
  assert.match(handler, /providedWebhookSecret: providedSecret/)

  activeCalls = null
  console.log('telegramWebhookSecretRoute: ALL OK')
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error)
  process.exitCode = 1
})
