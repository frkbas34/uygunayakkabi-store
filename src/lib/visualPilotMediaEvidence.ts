import { createHash } from 'node:crypto'
import { lookup as nodeLookup } from 'node:dns/promises'
import { request as nodeHttpsRequest, type RequestOptions } from 'node:https'
import { isIP, type LookupFunction } from 'node:net'
import { Readable } from 'node:stream'
import {
  checkServerIdentity as nodeCheckServerIdentity,
  type PeerCertificate,
} from 'node:tls'
import { Worker } from 'node:worker_threads'

export const VISUAL_PILOT_MEDIA_MAX_BYTES = 10_000_000
export const VISUAL_PILOT_MEDIA_TIMEOUT_MS = 15_000
export const VISUAL_PILOT_MEDIA_MAX_REDIRECTS = 3
export const VISUAL_PILOT_MEDIA_MAX_INPUT_PIXELS = 40_000_000

export type VisualPilotMediaFailureCode =
  | 'ORIGINAL_MEDIA_URL_MISSING'
  | 'ORIGINAL_MEDIA_URL_PROTOCOL_BLOCKED'
  | 'ORIGINAL_MEDIA_HOST_BLOCKED'
  | 'ORIGINAL_MEDIA_PATH_BLOCKED'
  | 'ORIGINAL_MEDIA_DNS_BLOCKED'
  | 'ORIGINAL_REDIRECT_INVALID'
  | 'ORIGINAL_REDIRECT_HOST_BLOCKED'
  | 'ORIGINAL_REDIRECT_LIMIT_EXCEEDED'
  | 'ORIGINAL_FETCH_TIMEOUT'
  | 'ORIGINAL_AGGREGATE_TIMEOUT'
  | 'ORIGINAL_FETCH_FAILED'
  | 'ORIGINAL_HTTP_FAILURE'
  | 'ORIGINAL_CONTENT_LENGTH_INVALID'
  | 'ORIGINAL_BYTE_LIMIT_EXCEEDED'
  | 'ORIGINAL_AGGREGATE_BYTE_LIMIT_EXCEEDED'
  | 'ORIGINAL_BODY_EMPTY'
  | 'ORIGINAL_MIME_MISSING'
  | 'ORIGINAL_MIME_UNSUPPORTED'
  | 'ORIGINAL_MIME_MISMATCH'
  | 'ORIGINAL_DECODE_FAILED'
  | 'ORIGINAL_FORMAT_MISMATCH'
  | 'ORIGINAL_DIMENSIONS_INVALID'
  | 'ORIGINAL_PIXEL_LIMIT_EXCEEDED'
  | 'ORIGINAL_AGGREGATE_PIXEL_LIMIT_EXCEEDED'
  | 'ORIGINAL_MULTIPAGE_UNSUPPORTED'

export type VisualPilotDecodedImage = {
  width: number
  height: number
  format: 'jpeg' | 'png' | 'webp' | 'gif'
  pages: number
}

export type VisualPilotMediaReadResult =
  | {
      ok: true
      width: number
      height: number
      mimeType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'
      /** Budget accounting only. Callers must never serialize downloaded bytes. */
      byteSize: number
      /** Integrity-only value. Callers must never serialize or print it. */
      contentDigest: string
      /** Aggregate accounting only. Never include this value in operator output. */
      consumedByteCount: number
      /** Aggregate accounting only. Never include this value in operator output. */
      knownPixelCount: number
    }
  | {
      ok: false
      code: VisualPilotMediaFailureCode
      /** Aggregate accounting only. Never include this value in operator output. */
      consumedByteCount: number
      /** Aggregate accounting only. Never include this value in operator output. */
      knownPixelCount: number
    }

export type VisualPilotDnsAddress = { address: string; family: number }

export type VisualPilotMediaReadDependencies = {
  fetchImpl?: typeof fetch
  pinnedFetchImpl?: (
    url: URL,
    pinnedAddress: VisualPilotDnsAddress,
    init: { signal: AbortSignal; headers: Record<string, string> },
  ) => Promise<Response>
  dnsLookup?: (hostname: string) => Promise<VisualPilotDnsAddress[]>
  decodeImage?: (bytes: Buffer, signal: AbortSignal) => Promise<VisualPilotDecodedImage>
  decodeWorkerFactory?: VisualPilotDecodeWorkerFactory
  signal?: AbortSignal
  timeoutMs?: number
  timeoutFailureCode?: Extract<VisualPilotMediaFailureCode, 'ORIGINAL_FETCH_TIMEOUT' | 'ORIGINAL_AGGREGATE_TIMEOUT'>
  maxBytes?: number
  byteLimitFailureCode?: Extract<VisualPilotMediaFailureCode, 'ORIGINAL_BYTE_LIMIT_EXCEEDED' | 'ORIGINAL_AGGREGATE_BYTE_LIMIT_EXCEEDED'>
  maxInputPixels?: number
  pixelLimitFailureCode?: Extract<VisualPilotMediaFailureCode, 'ORIGINAL_PIXEL_LIMIT_EXCEEDED' | 'ORIGINAL_AGGREGATE_PIXEL_LIMIT_EXCEEDED'>
  maxRedirects?: number
  canonicalOrigin?: string
}

export type VisualPilotDecodeWorker = {
  on(event: 'message', listener: (value: unknown) => void): unknown
  once(event: 'message', listener: (value: unknown) => void): unknown
  once(event: 'error', listener: (error: Error) => void): unknown
  once(event: 'exit', listener: (code: number) => void): unknown
  removeListener(event: 'message', listener: (value: unknown) => void): unknown
  removeListener(event: 'error', listener: (error: Error) => void): unknown
  removeListener(event: 'exit', listener: (code: number) => void): unknown
  terminate(): Promise<number>
}

export type VisualPilotDecodeWorkerFactory = (
  source: string,
  options: { eval: true; workerData: Record<string, unknown>; transferList: ArrayBuffer[] },
) => VisualPilotDecodeWorker

export type VisualPilotPinnedHttpsTransport = {
  requestImpl?: typeof nodeHttpsRequest
  checkServerIdentityImpl?: (hostname: string, cert: PeerCertificate) => Error | undefined
}

const SUPPORTED_MIME_TO_FORMAT = {
  'image/jpeg': 'jpeg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
} as const

const APPLICATION_HOSTS = new Set(['uygunayakkabi.com', 'www.uygunayakkabi.com'])
const VERCEL_BLOB_SUFFIX = '.public.blob.vercel-storage.com'

function normalizedMime(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null
  const mime = value.split(';', 1)[0]?.trim().toLowerCase()
  return mime || null
}

function isSupportedMime(value: string): value is keyof typeof SUPPORTED_MIME_TO_FORMAT {
  return Object.prototype.hasOwnProperty.call(SUPPORTED_MIME_TO_FORMAT, value)
}

function isTrustedHost(hostname: string): boolean {
  const host = hostname.toLowerCase()
  return APPLICATION_HOSTS.has(host)
    || (host.endsWith(VERCEL_BLOB_SUFFIX) && host.length > VERCEL_BLOB_SUFFIX.length)
}

function isTrustedPath(url: URL): boolean {
  if (!APPLICATION_HOSTS.has(url.hostname.toLowerCase())) return true
  return url.pathname.startsWith('/api/media/file/') || url.pathname.startsWith('/media/')
}

function parseIpv4(address: string): number[] | null {
  if (isIP(address) !== 4) return null
  const parts = address.split('.').map(Number)
  return parts.length === 4 && parts.every((part) => Number.isInteger(part) && part >= 0 && part <= 255)
    ? parts
    : null
}

function isPublicIpv4(address: string): boolean {
  const parts = parseIpv4(address)
  if (!parts) return false
  const [a, b] = parts
  if (
    a === 0
    || a === 10
    || a === 127
    || (a === 100 && b >= 64 && b <= 127)
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 0)
    || (a === 192 && b === 168)
    || (a === 192 && b === 0 && parts[2] === 2)
    || (a === 198 && (b === 18 || b === 19))
    || (a === 198 && b === 51 && parts[2] === 100)
    || (a === 203 && b === 0 && parts[2] === 113)
    || a >= 224
  ) return false
  return true
}

function isPublicIp(address: string): boolean {
  const version = isIP(address)
  if (version === 4) return isPublicIpv4(address)
  if (version !== 6) return false

  const expanded = expandIpv6(address)
  if (!expanded) return false
  const [first, second] = expanded
  // Positive global-unicast boundary. Reject special 2001::/23 allocations,
  // documentation space, 6to4, mapped/NAT64, ULA, link/site-local, multicast,
  // loopback and unspecified forms instead of trying to enumerate strings.
  if (first < 0x2000 || first > 0x3fff) return false
  if (first === 0x2001 && (second <= 0x01ff || second === 0x0db8)) return false
  if (first === 0x2002) return false
  if (first === 0x3ffe) return false
  if (first === 0x3fff && (second & 0xf000) === 0) return false
  return true
}

function isPublicDnsAddress(entry: VisualPilotDnsAddress): boolean {
  const detectedFamily = isIP(entry.address)
  return (entry.family === 4 || entry.family === 6)
    && detectedFamily === entry.family
    && isPublicIp(entry.address)
}

function expandIpv6(address: string): number[] | null {
  let input = address.toLowerCase()
  const zoneIndex = input.indexOf('%')
  if (zoneIndex >= 0) input = input.slice(0, zoneIndex)
  if (input.includes('.')) {
    const lastColon = input.lastIndexOf(':')
    if (lastColon < 0) return null
    const ipv4 = parseIpv4(input.slice(lastColon + 1))
    if (!ipv4) return null
    const high = ((ipv4[0] << 8) | ipv4[1]).toString(16)
    const low = ((ipv4[2] << 8) | ipv4[3]).toString(16)
    input = `${input.slice(0, lastColon)}:${high}:${low}`
  }
  const halves = input.split('::')
  if (halves.length > 2) return null
  const left = halves[0] ? halves[0].split(':') : []
  const right = halves.length === 2 && halves[1] ? halves[1].split(':') : []
  if (halves.length === 1 && left.length !== 8) return null
  const zeros = halves.length === 2 ? 8 - left.length - right.length : 0
  if (zeros < 1 && halves.length === 2) return null
  const pieces = [...left, ...Array.from({ length: zeros }, () => '0'), ...right]
  if (pieces.length !== 8 || pieces.some((piece) => !/^[0-9a-f]{1,4}$/.test(piece))) return null
  return pieces.map((piece) => Number.parseInt(piece, 16))
}

function validateUrl(raw: string, base: string):
  | { ok: true; url: URL }
  | { ok: false; code: VisualPilotMediaFailureCode } {
  let url: URL
  try {
    url = new URL(raw, base)
  } catch {
    return { ok: false, code: 'ORIGINAL_MEDIA_URL_MISSING' }
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.hash) {
    return { ok: false, code: 'ORIGINAL_MEDIA_URL_PROTOCOL_BLOCKED' }
  }
  if (isIP(url.hostname) !== 0 || url.hostname.toLowerCase() === 'localhost' || !isTrustedHost(url.hostname)) {
    return { ok: false, code: 'ORIGINAL_MEDIA_HOST_BLOCKED' }
  }
  if (!isTrustedPath(url)) return { ok: false, code: 'ORIGINAL_MEDIA_PATH_BLOCKED' }
  return { ok: true, url }
}

async function defaultDnsLookup(hostname: string): Promise<VisualPilotDnsAddress[]> {
  const values = await nodeLookup(hostname, { all: true, verbatim: true })
  return values.map((value) => ({ address: value.address, family: value.family }))
}

async function awaitWithAbort<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) throw new Error('aborted')
  let onAbort: (() => void) | undefined
  const aborted = new Promise<never>((_resolve, reject) => {
    onAbort = () => reject(new Error('aborted'))
    signal.addEventListener('abort', onAbort, { once: true })
  })
  try {
    return await Promise.race([promise, aborted])
  } finally {
    if (onAbort) signal.removeEventListener('abort', onAbort)
  }
}

export async function pinnedHttpsFetch(
  url: URL,
  pinnedAddress: VisualPilotDnsAddress,
  init: { signal: AbortSignal; headers: Record<string, string> },
  transport: VisualPilotPinnedHttpsTransport = {},
): Promise<Response> {
  return new Promise<Response>((resolve, reject) => {
    const pinnedLookup: LookupFunction = (_hostname, options, callback) => {
      if (options.all) {
        callback(null, [{ address: pinnedAddress.address, family: pinnedAddress.family }])
        return
      }
      callback(null, pinnedAddress.address, pinnedAddress.family)
    }
    const checkServerIdentity = transport.checkServerIdentityImpl ?? nodeCheckServerIdentity
    const options: RequestOptions = {
      method: 'GET',
      headers: { ...init.headers, Host: url.host },
      signal: init.signal,
      servername: url.hostname,
      rejectUnauthorized: true,
      family: pinnedAddress.family,
      lookup: pinnedLookup,
      checkServerIdentity: (_hostname, certificate) => checkServerIdentity(url.hostname, certificate),
    }
    const request = (transport.requestImpl ?? nodeHttpsRequest)(url, options, (incoming) => {
      const headers = new Headers()
      for (const [name, raw] of Object.entries(incoming.headers)) {
        if (Array.isArray(raw)) for (const value of raw) headers.append(name, value)
        else if (raw !== undefined) headers.set(name, String(raw))
      }
      const status = incoming.statusCode ?? 0
      const noBody = status === 204 || status === 205 || status === 304
      const body = noBody ? null : Readable.toWeb(incoming) as ReadableStream<Uint8Array>
      try {
        resolve(new Response(body, { status, headers }))
      } catch (error) {
        incoming.destroy()
        reject(error)
      }
    })
    request.once('error', reject)
    request.end()
  })
}

function cancelResponseBody(response: Response): void {
  if (response.body) void response.body.cancel().catch(() => undefined)
}

export async function decodeVisualPilotImage(bytes: Buffer): Promise<VisualPilotDecodedImage> {
  return decodeVisualPilotImageInWorker(bytes)
}

const VISUAL_PILOT_SHARP_WORKER_SOURCE = String.raw`
'use strict';
const { parentPort, workerData } = require('node:worker_threads');
(async () => {
  let input = Buffer.from(workerData.bytes);
  try {
    const sharp = require('sharp');
    const instance = sharp(input, {
      failOn: 'warning',
      limitInputPixels: workerData.hardMaxInputPixels,
      unlimited: false,
      sequentialRead: true,
      pages: 1,
    });
    const metadata = await instance.metadata();
    const width = metadata.width || 0;
    const height = metadata.height || 0;
    const knownPixelCount = width > 0 && height > 0 && Number.isSafeInteger(width * height)
      ? width * height
      : 0;
    parentPort.postMessage({ stage: 'metadata', knownPixelCount });
    if (knownPixelCount > workerData.budgetPixels) {
      parentPort.postMessage({ ok: false, code: 'pixel_limit', knownPixelCount });
      return;
    }
    await instance.stats();
    const format = metadata.format;
    if (!['jpeg', 'png', 'webp', 'gif'].includes(format)) throw new Error('unsupported');
    parentPort.postMessage({
      ok: true,
      value: {
        width,
        height,
        format,
        pages: metadata.pages || 1,
      },
    });
  } catch {
    parentPort.postMessage({ ok: false });
  } finally {
    input.fill(0);
    input = null;
  }
})().catch(() => parentPort.postMessage({ ok: false }));
`

function defaultDecodeWorkerFactory(
  source: string,
  options: { eval: true; workerData: Record<string, unknown>; transferList: ArrayBuffer[] },
): VisualPilotDecodeWorker {
  return new Worker(source, options) as VisualPilotDecodeWorker
}

function isDecodedWorkerValue(value: unknown): value is VisualPilotDecodedImage {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const candidate = value as Record<string, unknown>
  return Number.isInteger(candidate.width)
    && Number.isInteger(candidate.height)
    && Number.isInteger(candidate.pages)
    && (candidate.format === 'jpeg' || candidate.format === 'png' || candidate.format === 'webp' || candidate.format === 'gif')
}

class VisualPilotDecodeFailure extends Error {
  readonly knownPixelCount: number

  constructor(code: string, knownPixelCount: number) {
    super(code)
    this.name = 'VisualPilotDecodeFailure'
    this.knownPixelCount = knownPixelCount
  }
}

function safeKnownPixelCount(width: unknown, height: unknown): number {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height)) return 0
  const widthNumber = Number(width)
  const heightNumber = Number(height)
  if (widthNumber <= 0 || heightNumber <= 0) return 0
  const pixels = widthNumber * heightNumber
  return Number.isSafeInteger(pixels) ? pixels : Number.MAX_SAFE_INTEGER
}

function decodeFailureKnownPixels(error: unknown): number {
  return error instanceof VisualPilotDecodeFailure ? error.knownPixelCount : 0
}

export async function decodeVisualPilotImageInWorker(
  bytes: Buffer,
  options: {
    signal?: AbortSignal
    maxInputPixels?: number
    workerFactory?: VisualPilotDecodeWorkerFactory
  } = {},
): Promise<VisualPilotDecodedImage> {
  if (options.signal?.aborted) throw new Error('visual_pilot_decode_aborted')
  const transferable = Uint8Array.from(bytes)
  const worker = (options.workerFactory ?? defaultDecodeWorkerFactory)(VISUAL_PILOT_SHARP_WORKER_SOURCE, {
    eval: true,
    workerData: {
      bytes: transferable,
      hardMaxInputPixels: VISUAL_PILOT_MEDIA_MAX_INPUT_PIXELS,
      budgetPixels: options.maxInputPixels ?? VISUAL_PILOT_MEDIA_MAX_INPUT_PIXELS,
    },
    transferList: [transferable.buffer],
  })

  return new Promise<VisualPilotDecodedImage>((resolve, reject) => {
    let settled = false
    let message: VisualPilotDecodedImage | null = null
    let knownPixelCount = 0

    const cleanup = () => {
      worker.removeListener('message', onMessage)
      worker.removeListener('error', onError)
      worker.removeListener('exit', onExit)
      options.signal?.removeEventListener('abort', onAbort)
    }
    const settle = (value: VisualPilotDecodedImage | null) => {
      if (settled) return
      settled = true
      cleanup()
      if (value) resolve(value)
      else reject(new VisualPilotDecodeFailure('visual_pilot_decode_failed', knownPixelCount))
    }
    const terminateAndReject = async (code = 'visual_pilot_decode_failed') => {
      if (settled) return
      settled = true
      cleanup()
      await worker.terminate().catch(() => undefined)
      reject(new VisualPilotDecodeFailure(code, knownPixelCount))
    }
    const onMessage = (raw: unknown) => {
      if (
        raw
        && typeof raw === 'object'
        && !Array.isArray(raw)
        && (raw as Record<string, unknown>).stage === 'metadata'
        && Number.isSafeInteger((raw as Record<string, unknown>).knownPixelCount)
        && Number((raw as Record<string, unknown>).knownPixelCount) >= 0
      ) {
        knownPixelCount = Number((raw as Record<string, unknown>).knownPixelCount)
        return
      }
      if (
        raw
        && typeof raw === 'object'
        && !Array.isArray(raw)
        && (raw as Record<string, unknown>).ok === true
        && isDecodedWorkerValue((raw as Record<string, unknown>).value)
      ) {
        message = (raw as { value: VisualPilotDecodedImage }).value
      } else if (
        raw
        && typeof raw === 'object'
        && !Array.isArray(raw)
        && (raw as Record<string, unknown>).ok === false
        && (raw as Record<string, unknown>).code === 'pixel_limit'
      ) {
        const reportedPixels = (raw as Record<string, unknown>).knownPixelCount
        if (Number.isSafeInteger(reportedPixels) && Number(reportedPixels) >= 0) {
          knownPixelCount = Number(reportedPixels)
        }
        void terminateAndReject('visual_pilot_decode_pixel_limit')
      } else {
        void terminateAndReject()
      }
    }
    const onError = () => { void terminateAndReject() }
    const onExit = (code: number) => settle(code === 0 ? message : null)
    const onAbort = () => { void terminateAndReject() }

    worker.on('message', onMessage)
    worker.once('error', onError)
    worker.once('exit', onExit)
    options.signal?.addEventListener('abort', onAbort, { once: true })
    if (options.signal?.aborted) onAbort()
  })
}

function resolveMediaUrl(media: Record<string, unknown>): string | null {
  if (typeof media.url === 'string' && media.url.trim()) return media.url.trim()
  if (typeof media.filename === 'string' && media.filename.trim()) {
    return `/media/${encodeURIComponent(media.filename.trim())}`
  }
  return null
}

async function readBoundedBody(
  response: Response,
  maxBytes: number,
  controller: AbortController,
  byteLimitFailureCode: Extract<VisualPilotMediaFailureCode, 'ORIGINAL_BYTE_LIMIT_EXCEEDED' | 'ORIGINAL_AGGREGATE_BYTE_LIMIT_EXCEEDED'>,
  onBytesConsumed: (count: number) => void,
): Promise<Buffer | VisualPilotMediaFailureCode> {
  const declared = response.headers.get('content-length')
  if (declared !== null) {
    if (!/^\d+$/.test(declared)) {
      controller.abort()
      cancelResponseBody(response)
      return 'ORIGINAL_CONTENT_LENGTH_INVALID'
    }
    const declaredBytes = Number(declared)
    if (!Number.isSafeInteger(declaredBytes) || declaredBytes > maxBytes) {
      controller.abort()
      return byteLimitFailureCode
    }
  }
  if (!response.body) return 'ORIGINAL_BODY_EMPTY'

  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  while (true) {
    const result = await awaitWithAbort(reader.read(), controller.signal)
    if (result.done) break
    if (!result.value) continue
    total += result.value.byteLength
    onBytesConsumed(result.value.byteLength)
    if (total > maxBytes) {
      controller.abort()
      void reader.cancel().catch(() => undefined)
      return byteLimitFailureCode
    }
    chunks.push(result.value)
  }
  if (total === 0) return 'ORIGINAL_BODY_EMPTY'
  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)), total)
}

export async function readVisualPilotMediaEvidence(
  media: Record<string, unknown>,
  dependencies: VisualPilotMediaReadDependencies = {},
): Promise<VisualPilotMediaReadResult> {
  let consumedByteCount = 0
  let knownPixelCount = 0
  const failure = (code: VisualPilotMediaFailureCode): VisualPilotMediaReadResult => ({
    ok: false,
    code,
    consumedByteCount,
    knownPixelCount,
  })
  const fetchImpl = dependencies.fetchImpl ?? fetch
  const dnsLookup = dependencies.dnsLookup ?? defaultDnsLookup
  const timeoutMs = dependencies.timeoutMs ?? VISUAL_PILOT_MEDIA_TIMEOUT_MS
  const timeoutFailureCode = dependencies.timeoutFailureCode ?? 'ORIGINAL_FETCH_TIMEOUT'
  const maxBytes = dependencies.maxBytes ?? VISUAL_PILOT_MEDIA_MAX_BYTES
  const byteLimitFailureCode = dependencies.byteLimitFailureCode ?? 'ORIGINAL_BYTE_LIMIT_EXCEEDED'
  const maxInputPixels = dependencies.maxInputPixels ?? VISUAL_PILOT_MEDIA_MAX_INPUT_PIXELS
  const pixelLimitFailureCode = dependencies.pixelLimitFailureCode ?? 'ORIGINAL_PIXEL_LIMIT_EXCEEDED'
  const maxRedirects = dependencies.maxRedirects ?? VISUAL_PILOT_MEDIA_MAX_REDIRECTS
  const canonicalOrigin = dependencies.canonicalOrigin ?? 'https://www.uygunayakkabi.com'
  const rawUrl = resolveMediaUrl(media)
  if (!rawUrl) return failure('ORIGINAL_MEDIA_URL_MISSING')

  const initial = validateUrl(rawUrl, canonicalOrigin)
  if (!initial.ok) return failure(initial.code)

  const expectedMime = normalizedMime(typeof media.mimeType === 'string' ? media.mimeType : null)
  if (!expectedMime) return failure('ORIGINAL_MIME_MISSING')
  if (!isSupportedMime(expectedMime)) return failure('ORIGINAL_MIME_UNSUPPORTED')

  const controller = new AbortController()
  const externalSignal = dependencies.signal
  const onExternalAbort = () => controller.abort()
  externalSignal?.addEventListener('abort', onExternalAbort, { once: true })
  if (externalSignal?.aborted) controller.abort()
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, timeoutMs)

  try {
    let current = initial.url
    const visited = new Set<string>()
    for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount += 1) {
      if (visited.has(current.href)) return failure('ORIGINAL_REDIRECT_INVALID')
      visited.add(current.href)

      let addresses: VisualPilotDnsAddress[]
      try {
        addresses = await awaitWithAbort(dnsLookup(current.hostname), controller.signal)
      } catch {
        return failure(timedOut || externalSignal?.aborted ? timeoutFailureCode : 'ORIGINAL_MEDIA_DNS_BLOCKED')
      }
      if (addresses.length === 0 || addresses.some((entry) => !isPublicDnsAddress(entry))) {
        return failure('ORIGINAL_MEDIA_DNS_BLOCKED')
      }
      const pinnedAddress = [...addresses].sort((left, right) =>
        left.family - right.family || left.address.localeCompare(right.address),
      )[0]

      let response: Response
      try {
        const headers = { Accept: 'image/jpeg,image/png,image/webp,image/gif' }
        response = dependencies.fetchImpl
          ? await awaitWithAbort(fetchImpl(current, {
              method: 'GET',
              redirect: 'manual',
              signal: controller.signal,
              headers,
            }), controller.signal)
          : await awaitWithAbort(
              (dependencies.pinnedFetchImpl ?? pinnedHttpsFetch)(current, pinnedAddress, {
                signal: controller.signal,
                headers,
              }),
              controller.signal,
            )
      } catch {
        return failure(timedOut || externalSignal?.aborted ? timeoutFailureCode : 'ORIGINAL_FETCH_FAILED')
      }

      if (response.status >= 300 && response.status < 400) {
        if (redirectCount >= maxRedirects) {
          cancelResponseBody(response)
          return failure('ORIGINAL_REDIRECT_LIMIT_EXCEEDED')
        }
        const location = response.headers.get('location')
        if (!location) {
          cancelResponseBody(response)
          return failure('ORIGINAL_REDIRECT_INVALID')
        }
        let nextRaw: string
        try {
          nextRaw = new URL(location, current).href
        } catch {
          cancelResponseBody(response)
          return failure('ORIGINAL_REDIRECT_INVALID')
        }
        const next = validateUrl(nextRaw, canonicalOrigin)
        if (!next.ok) {
          cancelResponseBody(response)
          return failure(next.code === 'ORIGINAL_MEDIA_HOST_BLOCKED'
            ? 'ORIGINAL_REDIRECT_HOST_BLOCKED'
            : 'ORIGINAL_REDIRECT_INVALID')
        }
        cancelResponseBody(response)
        current = next.url
        continue
      }

      if (!response.ok) {
        cancelResponseBody(response)
        return failure('ORIGINAL_HTTP_FAILURE')
      }
      const responseMime = normalizedMime(response.headers.get('content-type'))
      if (!responseMime) {
        cancelResponseBody(response)
        return failure('ORIGINAL_MIME_MISSING')
      }
      if (!isSupportedMime(responseMime)) {
        cancelResponseBody(response)
        return failure('ORIGINAL_MIME_UNSUPPORTED')
      }
      if (responseMime !== expectedMime) {
        cancelResponseBody(response)
        return failure('ORIGINAL_MIME_MISMATCH')
      }

      let bytesOrCode: Buffer | VisualPilotMediaFailureCode
      try {
        bytesOrCode = await readBoundedBody(
          response,
          maxBytes,
          controller,
          byteLimitFailureCode,
          (count) => { consumedByteCount += count },
        )
      } catch {
        return failure(timedOut || externalSignal?.aborted ? timeoutFailureCode : 'ORIGINAL_FETCH_FAILED')
      }
      if (typeof bytesOrCode === 'string') return failure(bytesOrCode)

      let decoded: VisualPilotDecodedImage
      const contentDigest = createHash('sha256').update(bytesOrCode).digest('hex')
      const byteSize = bytesOrCode.byteLength
      try {
        decoded = dependencies.decodeImage
          ? await awaitWithAbort(dependencies.decodeImage(bytesOrCode, controller.signal), controller.signal)
          : await decodeVisualPilotImageInWorker(bytesOrCode, {
              signal: controller.signal,
              maxInputPixels,
              workerFactory: dependencies.decodeWorkerFactory,
            })
      } catch (error) {
        knownPixelCount = decodeFailureKnownPixels(error)
        return failure(timedOut || externalSignal?.aborted
          ? timeoutFailureCode
          : error instanceof Error && error.message === 'visual_pilot_decode_pixel_limit'
            ? pixelLimitFailureCode
            : 'ORIGINAL_DECODE_FAILED')
      } finally {
        bytesOrCode.fill(0)
      }
      knownPixelCount = safeKnownPixelCount(decoded.width, decoded.height)
      if (!Number.isInteger(decoded.width) || decoded.width <= 0 || !Number.isInteger(decoded.height) || decoded.height <= 0) {
        return failure('ORIGINAL_DIMENSIONS_INVALID')
      }
      if (decoded.width * decoded.height > maxInputPixels) {
        return failure(pixelLimitFailureCode)
      }
      if (decoded.pages !== 1) return failure('ORIGINAL_MULTIPAGE_UNSUPPORTED')
      if (SUPPORTED_MIME_TO_FORMAT[responseMime] !== decoded.format) {
        return failure('ORIGINAL_FORMAT_MISMATCH')
      }

      return {
        ok: true,
        width: decoded.width,
        height: decoded.height,
        mimeType: responseMime,
        byteSize,
        contentDigest,
        consumedByteCount,
        knownPixelCount,
      }
    }
    return failure('ORIGINAL_REDIRECT_LIMIT_EXCEEDED')
  } finally {
    clearTimeout(timer)
    externalSignal?.removeEventListener('abort', onExternalAbort)
  }
}
