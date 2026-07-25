import assert from 'node:assert/strict'

import type { PayloadRequest } from 'payload'

import { executePayloadTransaction, type PayloadTransactionRuntime } from './payloadTransaction'

function runtime(seed: { begin?: boolean; failCommit?: boolean } = {}) {
  const events: string[] = []
  const req = {} as PayloadRequest
  const value: PayloadTransactionRuntime = {
    begin: async () => {
      events.push('begin')
      return seed.begin ?? true
    },
    commit: async () => {
      events.push('commit')
      if (seed.failCommit) throw new Error('commit failed')
    },
    createRequest: async () => {
      events.push('request')
      return req
    },
    rollback: async () => {
      events.push('rollback')
    },
  }
  return { events, runtime: value }
}

async function main(): Promise<void> {
  {
    const fixture = runtime()
    let receivedReq: PayloadRequest | undefined
    const result = await executePayloadTransaction(fixture.runtime, async (req) => {
      receivedReq = req
      fixture.events.push('work')
      return 'ok'
    })
    assert.equal(result, 'ok')
    assert.ok(receivedReq)
    assert.deepEqual(fixture.events, ['request', 'begin', 'work', 'commit'])
  }

  {
    const fixture = runtime()
    await assert.rejects(
      () => executePayloadTransaction(fixture.runtime, async () => {
        fixture.events.push('work')
        throw new Error('work failed')
      }),
      /work failed/,
    )
    assert.deepEqual(fixture.events, ['request', 'begin', 'work', 'rollback'])
  }

  {
    const fixture = runtime({ failCommit: true })
    await assert.rejects(
      () => executePayloadTransaction(fixture.runtime, async () => {
        fixture.events.push('work')
        return 'ok'
      }),
      /commit failed/,
    )
    assert.deepEqual(fixture.events, ['request', 'begin', 'work', 'commit', 'rollback'])
  }

  {
    const fixture = runtime({ begin: false })
    await assert.rejects(
      () => executePayloadTransaction(fixture.runtime, async () => {
        fixture.events.push('work')
        return 'not reached'
      }),
      /transaction unavailable/,
    )
    assert.deepEqual(fixture.events, ['request', 'begin'])
  }

  console.log('payloadTransaction: ALL OK')
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error)
  process.exit(1)
})
