import assert from 'node:assert/strict'

import {
  readVisualPilotMediaEvidence,
  type VisualPilotMediaReadDependencies,
} from './visualPilotMediaEvidence'

let passed = 0

async function check(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn()
    passed += 1
    console.log(`  ok - ${name}`)
  } catch (error) {
    console.error(`  fail - ${name}\n    ${(error as Error).message}`)
    process.exitCode = 1
  }
}

const publicDns = async () => [{ address: '93.184.216.34', family: 4 }]
const decodedJpeg = async () => ({ width: 1200, height: 800, format: 'jpeg' as const, pages: 1 })

function media(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 1,
    url: 'https://fixture.public.blob.vercel-storage.com/original.jpg',
    mimeType: 'image/jpeg',
    filename: 'original.jpg',
    ...overrides,
  }
}

function response(body: BodyInit | null = new Uint8Array([1, 2, 3]), init: ResponseInit = {}): Response {
  return new Response(body, {
    status: 200,
    headers: { 'content-type': 'image/jpeg', ...(init.headers ?? {}) },
    ...init,
  })
}

function deps(overrides: VisualPilotMediaReadDependencies = {}): VisualPilotMediaReadDependencies {
  return {
    fetchImpl: async () => response(),
    dnsLookup: publicDns,
    decodeImage: decodedJpeg,
    ...overrides,
  }
}

async function main(): Promise<void> {
await check('valid public raster is decoded in memory', async () => {
  const result = await readVisualPilotMediaEvidence(media(), deps())
  assert.equal(result.ok, true)
  if (result.ok) {
    assert.equal(result.width, 1200)
    assert.equal(result.height, 800)
    assert.match(result.contentDigest, /^[a-f0-9]{64}$/)
  }
})

await check('relative canonical media path resolves without entering output', async () => {
  let calls = 0
  const result = await readVisualPilotMediaEvidence(media({ url: '/api/media/file/original.jpg' }), deps({
    fetchImpl: async () => { calls += 1; return response() },
  }))
  assert.equal(result.ok, true)
  assert.equal(calls, 1)
  assert.equal(JSON.stringify(result).includes('uygunayakkabi.com'), false)
})

await check('missing URL and filename fail closed', async () => {
  const result = await readVisualPilotMediaEvidence(media({ url: null, filename: null }), deps())
  assert.deepEqual(result, { ok: false, code: 'ORIGINAL_MEDIA_URL_MISSING' })
})

await check('HTTP, credentials, fragments, and custom ports block before fetch', async () => {
  let calls = 0
  for (const url of [
    'http://www.uygunayakkabi.com/media/a.jpg',
    'https://user:pass@www.uygunayakkabi.com/media/a.jpg',
    'https://www.uygunayakkabi.com:444/media/a.jpg',
    'https://www.uygunayakkabi.com/media/a.jpg#fragment',
  ]) {
    const result = await readVisualPilotMediaEvidence(media({ url }), deps({ fetchImpl: async () => { calls += 1; return response() } }))
    assert.equal(result.ok, false)
  }
  assert.equal(calls, 0)
})

await check('IP, localhost, untrusted, and lookalike Blob hosts block before fetch', async () => {
  let calls = 0
  for (const url of [
    'https://127.0.0.1/media/a.jpg',
    'https://localhost/media/a.jpg',
    'https://example.com/a.jpg',
    'https://public.blob.vercel-storage.com.evil.example/a.jpg',
  ]) {
    const result = await readVisualPilotMediaEvidence(media({ url }), deps({ fetchImpl: async () => { calls += 1; return response() } }))
    assert.equal(result.ok, false)
  }
  assert.equal(calls, 0)
})

await check('application host only permits canonical media paths', async () => {
  const result = await readVisualPilotMediaEvidence(
    media({ url: 'https://www.uygunayakkabi.com/admin/collections/media' }),
    deps(),
  )
  assert.deepEqual(result, { ok: false, code: 'ORIGINAL_MEDIA_PATH_BLOCKED' })
})

await check('private, loopback, link-local, and empty DNS results block fetch', async () => {
  for (const address of ['10.0.0.1', '127.0.0.1', '169.254.1.1', '::1', 'fd00::1']) {
    let calls = 0
    const result = await readVisualPilotMediaEvidence(media(), deps({
      dnsLookup: async () => [{ address, family: address.includes(':') ? 6 : 4 }],
      fetchImpl: async () => { calls += 1; return response() },
    }))
    assert.deepEqual(result, { ok: false, code: 'ORIGINAL_MEDIA_DNS_BLOCKED' })
    assert.equal(calls, 0)
  }
})

await check('alternate and special-range IPv6 addresses fail closed before retrieval', async () => {
  const blocked = [
    '0:0:0:0:0:0:0:0',
    '0:0:0:0:0:0:0:1',
    '::ffff:127.0.0.1',
    '64:ff9b::7f00:1',
    'fec0::1',
    '2001::1',
    '2001:db8::1',
    '2002:7f00:1::1',
    '3ffe::1',
    '3fff::1',
  ]
  for (const address of blocked) {
    let calls = 0
    const result = await readVisualPilotMediaEvidence(media(), deps({
      dnsLookup: async () => [{ address, family: 6 }],
      fetchImpl: async () => { calls += 1; return response() },
    }))
    assert.deepEqual(result, { ok: false, code: 'ORIGINAL_MEDIA_DNS_BLOCKED' }, address)
    assert.equal(calls, 0, address)
  }
})

await check('DNS address family must match the parsed address family', async () => {
  let calls = 0
  const result = await readVisualPilotMediaEvidence(media(), deps({
    dnsLookup: async () => [{ address: '93.184.216.34', family: 6 }],
    fetchImpl: async () => { calls += 1; return response() },
  }))
  assert.deepEqual(result, { ok: false, code: 'ORIGINAL_MEDIA_DNS_BLOCKED' })
  assert.equal(calls, 0)
})

await check('validated DNS address is pinned to the HTTPS connection', async () => {
  let dnsCalls = 0
  const pinned: Array<{ hostname: string; address: string; family: number }> = []
  const result = await readVisualPilotMediaEvidence(media(), {
    dnsLookup: async () => {
      dnsCalls += 1
      // A second lookup would represent a rebinding opportunity and must not be
      // needed by the injected connection boundary.
      return dnsCalls === 1
        ? [{ address: '93.184.216.34', family: 4 }]
        : [{ address: '127.0.0.1', family: 4 }]
    },
    pinnedFetchImpl: async (url, address) => {
      pinned.push({ hostname: url.hostname, address: address.address, family: address.family })
      return response()
    },
    decodeImage: decodedJpeg,
  })
  assert.equal(result.ok, true)
  assert.equal(dnsCalls, 1)
  assert.deepEqual(pinned, [{
    hostname: 'fixture.public.blob.vercel-storage.com',
    address: '93.184.216.34',
    family: 4,
  }])
})

await check('a public global-unicast IPv6 address can be pinned', async () => {
  let pinnedAddress: string | null = null
  const result = await readVisualPilotMediaEvidence(media(), {
    dnsLookup: async () => [{ address: '2606:4700:4700::1111', family: 6 }],
    pinnedFetchImpl: async (_url, address) => {
      pinnedAddress = address.address
      return response()
    },
    decodeImage: decodedJpeg,
  })
  assert.equal(result.ok, true)
  assert.equal(pinnedAddress, '2606:4700:4700::1111')
})

await check('same-host and approved Blob redirects are manually validated', async () => {
  const seen: string[] = []
  const result = await readVisualPilotMediaEvidence(
    media({ url: 'https://www.uygunayakkabi.com/media/original.jpg' }),
    deps({
      fetchImpl: (async (input: URL | RequestInfo) => {
        const value = String(input)
        seen.push(value)
        if (seen.length === 1) return response(null, { status: 302, headers: { location: 'https://fixture.public.blob.vercel-storage.com/original.jpg' } })
        return response()
      }) as typeof fetch,
    }),
  )
  assert.equal(result.ok, true)
  assert.equal(seen.length, 2)
})

await check('redirect to untrusted host blocks before second retrieval', async () => {
  let calls = 0
  const result = await readVisualPilotMediaEvidence(media(), deps({
    fetchImpl: (async () => {
      calls += 1
      return response(null, { status: 302, headers: { location: 'https://evil.example/secret.jpg' } })
    }) as typeof fetch,
  }))
  assert.deepEqual(result, { ok: false, code: 'ORIGINAL_REDIRECT_HOST_BLOCKED' })
  assert.equal(calls, 1)
})

await check('missing Location and redirect loops fail closed', async () => {
  const missing = await readVisualPilotMediaEvidence(media(), deps({
    fetchImpl: (async () => response(null, { status: 302 })) as typeof fetch,
  }))
  assert.deepEqual(missing, { ok: false, code: 'ORIGINAL_REDIRECT_INVALID' })
  const loop = await readVisualPilotMediaEvidence(media(), deps({
    fetchImpl: (async () => response(null, { status: 302, headers: { location: '/original.jpg' } })) as typeof fetch,
  }))
  assert.deepEqual(loop, { ok: false, code: 'ORIGINAL_REDIRECT_INVALID' })
})

await check('redirect count is capped', async () => {
  let index = 0
  const result = await readVisualPilotMediaEvidence(media(), deps({
    maxRedirects: 2,
    fetchImpl: (async () => {
      index += 1
      return response(null, { status: 302, headers: { location: `https://fixture.public.blob.vercel-storage.com/r${index}.jpg` } })
    }) as typeof fetch,
  }))
  assert.deepEqual(result, { ok: false, code: 'ORIGINAL_REDIRECT_LIMIT_EXCEEDED' })
  assert.equal(index, 3)
})

await check('timeout emits only the stable timeout code', async () => {
  const result = await readVisualPilotMediaEvidence(media(), deps({
    timeoutMs: 5,
    fetchImpl: ((_input, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new Error('secret signed URL')))
    })) as typeof fetch,
  }))
  assert.deepEqual(result, { ok: false, code: 'ORIGINAL_FETCH_TIMEOUT' })
})

await check('timeout also bounds DNS and decode waits', async () => {
  const dnsTimeout = await readVisualPilotMediaEvidence(media(), deps({
    timeoutMs: 5,
    dnsLookup: async () => new Promise(() => undefined),
  }))
  assert.deepEqual(dnsTimeout, { ok: false, code: 'ORIGINAL_FETCH_TIMEOUT' })

  const decodeTimeout = await readVisualPilotMediaEvidence(media(), deps({
    timeoutMs: 5,
    decodeImage: async () => new Promise(() => undefined),
  }))
  assert.deepEqual(decodeTimeout, { ok: false, code: 'ORIGINAL_FETCH_TIMEOUT' })
})

await check('invalid Content-Length aborts and cancels the response body', async () => {
  let cancelled = false
  const body = new ReadableStream<Uint8Array>({
    pull() {},
    cancel() { cancelled = true },
  })
  const result = await readVisualPilotMediaEvidence(media(), deps({
    fetchImpl: (async () => response(body, {
      headers: { 'content-type': 'image/jpeg', 'content-length': 'not-a-number' },
    })) as typeof fetch,
  }))
  assert.deepEqual(result, { ok: false, code: 'ORIGINAL_CONTENT_LENGTH_INVALID' })
  await Promise.resolve()
  assert.equal(cancelled, true)
})

await check('oversized Content-Length blocks before body consumption', async () => {
  let decoded = false
  const body = new ReadableStream({ pull(controller) { controller.enqueue(new Uint8Array([1])); controller.close() } })
  const result = await readVisualPilotMediaEvidence(media(), deps({
    maxBytes: 2,
    fetchImpl: (async () => response(body, { headers: { 'content-type': 'image/jpeg', 'content-length': '3' } })) as typeof fetch,
    decodeImage: async () => { decoded = true; return decodedJpeg() },
  }))
  assert.deepEqual(result, { ok: false, code: 'ORIGINAL_BYTE_LIMIT_EXCEEDED' })
  assert.equal(decoded, false)
})

await check('streamed overflow blocks when length is missing or deceptive', async () => {
  for (const contentLength of [undefined, '2']) {
    const headers: Record<string, string> = { 'content-type': 'image/jpeg' }
    if (contentLength) headers['content-length'] = contentLength
    const result = await readVisualPilotMediaEvidence(media(), deps({
      maxBytes: 2,
      fetchImpl: (async () => response(new Uint8Array([1, 2, 3]), { headers })) as typeof fetch,
    }))
    assert.deepEqual(result, { ok: false, code: 'ORIGINAL_BYTE_LIMIT_EXCEEDED' })
  }
})

await check('HTTP failure and empty body block', async () => {
  const http = await readVisualPilotMediaEvidence(media(), deps({
    fetchImpl: (async () => response(null, { status: 404 })) as typeof fetch,
  }))
  assert.deepEqual(http, { ok: false, code: 'ORIGINAL_HTTP_FAILURE' })
  const empty = await readVisualPilotMediaEvidence(media(), deps({
    fetchImpl: (async () => response(new Uint8Array(), { headers: { 'content-type': 'image/jpeg' } })) as typeof fetch,
  }))
  assert.deepEqual(empty, { ok: false, code: 'ORIGINAL_BODY_EMPTY' })
})

await check('missing, HTML, unsupported SVG, and deceptive MIME block', async () => {
  const missing = await readVisualPilotMediaEvidence(media(), deps({
    fetchImpl: (async () => new Response(new Uint8Array([1]), { status: 200 })) as typeof fetch,
  }))
  assert.deepEqual(missing, { ok: false, code: 'ORIGINAL_MIME_MISSING' })
  for (const mimeType of ['text/html', 'image/svg+xml']) {
    const result = await readVisualPilotMediaEvidence(media({ mimeType }), deps({
      fetchImpl: (async () => response(new Uint8Array([1]), { headers: { 'content-type': mimeType } })) as typeof fetch,
    }))
    assert.deepEqual(result, { ok: false, code: 'ORIGINAL_MIME_UNSUPPORTED' })
  }
  const mismatch = await readVisualPilotMediaEvidence(media(), deps({
    fetchImpl: (async () => response(new Uint8Array([1]), { headers: { 'content-type': 'image/png' } })) as typeof fetch,
  }))
  assert.deepEqual(mismatch, { ok: false, code: 'ORIGINAL_MIME_MISMATCH' })
})

await check('corrupt bytes and decoded format mismatch block', async () => {
  const corrupt = await readVisualPilotMediaEvidence(media(), deps({ decodeImage: async () => { throw new Error('corrupt') } }))
  assert.deepEqual(corrupt, { ok: false, code: 'ORIGINAL_DECODE_FAILED' })
  const mismatch = await readVisualPilotMediaEvidence(media(), deps({
    decodeImage: async () => ({ width: 100, height: 100, format: 'png', pages: 1 }),
  }))
  assert.deepEqual(mismatch, { ok: false, code: 'ORIGINAL_FORMAT_MISMATCH' })
})

await check('invalid dimensions, pixel overflow, and multipage input block', async () => {
  const invalid = await readVisualPilotMediaEvidence(media(), deps({
    decodeImage: async () => ({ width: 0, height: 10, format: 'jpeg', pages: 1 }),
  }))
  assert.deepEqual(invalid, { ok: false, code: 'ORIGINAL_DIMENSIONS_INVALID' })
  const pixels = await readVisualPilotMediaEvidence(media(), deps({
    decodeImage: async () => ({ width: 50_000, height: 50_000, format: 'jpeg', pages: 1 }),
  }))
  assert.deepEqual(pixels, { ok: false, code: 'ORIGINAL_PIXEL_LIMIT_EXCEEDED' })
  const pages = await readVisualPilotMediaEvidence(media({ mimeType: 'image/gif' }), deps({
    decodeImage: async () => ({ width: 100, height: 100, format: 'gif', pages: 2 }),
    fetchImpl: (async () => response(new Uint8Array([1]), { headers: { 'content-type': 'image/gif' } })) as typeof fetch,
  }))
  assert.deepEqual(pages, { ok: false, code: 'ORIGINAL_MULTIPAGE_UNSUPPORTED' })
})

await check('URL, signed query, bytes, and caught error text never enter results', async () => {
  const secret = 'HIGHLY_SECRET_TOKEN'
  const result = await readVisualPilotMediaEvidence(
    media({ url: `https://fixture.public.blob.vercel-storage.com/original.jpg?token=${secret}` }),
    deps({ fetchImpl: (async () => { throw new Error(`leak ${secret}`) }) as typeof fetch }),
  )
  const serialized = JSON.stringify(result)
  assert.equal(serialized.includes(secret), false)
  assert.equal(serialized.includes('https://'), false)
})

console.log(`\n${passed} visual pilot Media evidence tests passed.`)
if (process.exitCode) process.exit(process.exitCode)
}

void main()
