export type StorefrontMedia = {
  url?: string | null
  filename?: string | null
  sizes?: {
    large?: {
      url?: string | null
    } | null
  } | null
}

export type StorefrontImageEntry =
  | StorefrontMedia
  | { image?: StorefrontMedia | string | number | null }
  | string
  | number
  | null
  | undefined

export type ProductStorefrontImageInput = {
  generativeGallery?: StorefrontImageEntry[] | null
  images?: StorefrontImageEntry[] | null
  serverUrl?: string | null
}

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function normalizedBaseUrl(serverUrl: string | null | undefined): string {
  return typeof serverUrl === 'string' ? serverUrl.trim().replace(/\/$/, '') : ''
}

function toPublicUrl(value: unknown, serverUrl: string): string | null {
  if (typeof value !== 'string' || !value.trim()) return null

  const url = value.trim()
  if (/^https?:\/\//i.test(url)) return url
  if (url.startsWith('/')) return serverUrl ? `${serverUrl}${url}` : url
  return null
}

function extractEntryUrl(entry: StorefrontImageEntry, serverUrl: string): string | null {
  const row = asObject(entry)
  const image = row && 'image' in row ? row.image : entry

  if (typeof image === 'string') return toPublicUrl(image, serverUrl)

  const media = asObject(image)
  if (!media) return null

  const sizes = asObject(media.sizes)
  const large = asObject(sizes?.large)
  const largeUrl = toPublicUrl(large?.url, serverUrl)
  if (largeUrl) return largeUrl

  const mediaUrl = toPublicUrl(media.url, serverUrl)
  if (mediaUrl) return mediaUrl

  const filename = typeof media.filename === 'string' ? media.filename.trim() : ''
  if (!filename) return null

  const path = `/media/${encodeURIComponent(filename)}`
  return serverUrl ? `${serverUrl}${path}` : path
}

function resolveEntryUrls(entries: StorefrontImageEntry[] | null | undefined, serverUrl: string): string[] {
  if (!Array.isArray(entries)) return []

  const urls = entries
    .map((entry) => extractEntryUrl(entry, serverUrl))
    .filter((url): url is string => Boolean(url))

  return [...new Set(urls)]
}

/**
 * Prefer approved/generated gallery media, but keep original product media as
 * the PDP and schema fallback when generation has not produced a usable URL.
 */
export function resolveProductStorefrontImageUrls(input: ProductStorefrontImageInput): string[] {
  const serverUrl = normalizedBaseUrl(input.serverUrl)
  const generatedUrls = resolveEntryUrls(input.generativeGallery, serverUrl)
  return generatedUrls.length > 0
    ? generatedUrls
    : resolveEntryUrls(input.images, serverUrl)
}
