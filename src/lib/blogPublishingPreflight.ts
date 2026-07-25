export const BLOG_MIN_TITLE_LENGTH = 12
export const BLOG_MAX_SEO_TITLE_LENGTH = 60
export const BLOG_MIN_EXCERPT_LENGTH = 40
export const BLOG_MAX_SEO_DESCRIPTION_LENGTH = 160
export const BLOG_MIN_CONTENT_LENGTH = 300

export type BlogPreflightStatus = 'blocked' | 'needs_review' | 'ready'

export type BlogPreflight = {
  ref: string
  title: string
  source: string
  status: string
  contentLength: number
  blockers: string[]
  reviewItems: string[]
  warnings: string[]
  readiness: BlogPreflightStatus
}

const PLACEHOLDER_TERMS = ['taslak', 'draft', 'test', 'demo', 'ornek', 'ornek metin', 'lorem ipsum']
const EVIDENCE_REVIEW_TERMS = [
  'garantili',
  'kesin',
  'orijinal',
  '%100',
  '% 100',
  'en ucuz',
  'mucize',
  'tedavi',
]

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function displayValue(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return ''
}

function normalized(value: string): string {
  return value
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
}

function containsPlaceholder(value: string): boolean {
  const candidate = normalized(value)
  return PLACEHOLDER_TERMS.some((term) => candidate.includes(term))
}

function isSlug(value: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
}

function collectLexicalText(value: unknown, parts: string[]): void {
  if (!value || typeof value !== 'object') return
  if (Array.isArray(value)) {
    for (const child of value) collectLexicalText(child, parts)
    return
  }

  const node = value as Record<string, unknown>
  if (typeof node.text === 'string' && node.text.trim()) parts.push(node.text.trim())
  if (node.root && typeof node.root === 'object') collectLexicalText(node.root, parts)
  if (Array.isArray(node.children)) collectLexicalText(node.children, parts)
}

export function extractBlogPlainText(content: unknown): string {
  const parts: string[] = []
  collectLexicalText(content, parts)
  return parts.join(' ').replace(/\s+/g, ' ').trim()
}

function findEvidenceReviewTerms(content: string): string[] {
  const candidate = normalized(content)
  return EVIDENCE_REVIEW_TERMS.filter((term) => candidate.includes(normalized(term)))
}

export function evaluateBlogPublishingPreflight(post: Record<string, any>): BlogPreflight {
  const title = stringValue(post.title)
  const slug = stringValue(post.slug)
  const excerpt = stringValue(post.excerpt)
  const seo = post.seo && typeof post.seo === 'object' ? post.seo as Record<string, unknown> : {}
  const seoTitle = stringValue(seo.title)
  const seoDescription = stringValue(seo.description)
  const content = extractBlogPlainText(post.content)
  const source = stringValue(post.source) || 'manual'
  const status = stringValue(post.status) || 'draft'
  const ref = displayValue(post.id) || slug || 'blog-post'
  const blockers: string[] = []
  const reviewItems: string[] = []
  const warnings: string[] = []

  if (!title) blockers.push('Title is required.')
  else {
    if (title.length < BLOG_MIN_TITLE_LENGTH) blockers.push(`Title must be at least ${BLOG_MIN_TITLE_LENGTH} characters.`)
    if (containsPlaceholder(title)) blockers.push('Title contains placeholder or draft wording.')
  }

  if (!slug) blockers.push('Slug is required.')
  else if (!isSlug(slug)) blockers.push('Slug must contain only lowercase letters, numbers, and hyphens.')

  if (!excerpt) blockers.push('Excerpt is required for public article context.')
  else {
    if (excerpt.length < BLOG_MIN_EXCERPT_LENGTH) blockers.push(`Excerpt must be at least ${BLOG_MIN_EXCERPT_LENGTH} characters.`)
    if (containsPlaceholder(excerpt)) blockers.push('Excerpt contains placeholder or draft wording.')
  }

  if (content.length < BLOG_MIN_CONTENT_LENGTH) {
    blockers.push(`Article body must contain at least ${BLOG_MIN_CONTENT_LENGTH} readable characters.`)
  }
  if (containsPlaceholder(content)) blockers.push('Article body contains placeholder or draft wording.')

  const evidenceTerms = findEvidenceReviewTerms([title, excerpt, content].join(' '))
  if (evidenceTerms.length > 0) {
    reviewItems.push(`Verify evidence or soften claim language: ${evidenceTerms.join(', ')}.`)
  }
  if (source === 'ai') reviewItems.push('AI-generated article requires an operator claim and tone review before publishing.')

  if (!post.featuredImage) warnings.push('Featured image is missing; the public article can publish without one, but social sharing may be weaker.')
  if (!seoTitle) warnings.push('SEO title is missing; the public page will fall back to the article title.')
  else if (seoTitle.length > BLOG_MAX_SEO_TITLE_LENGTH) warnings.push(`SEO title exceeds the ${BLOG_MAX_SEO_TITLE_LENGTH}-character guidance.`)
  if (!seoDescription) warnings.push('SEO description is missing; the public page will fall back to the excerpt.')
  else if (seoDescription.length > BLOG_MAX_SEO_DESCRIPTION_LENGTH) warnings.push(`SEO description exceeds the ${BLOG_MAX_SEO_DESCRIPTION_LENGTH}-character guidance.`)
  if (!post.publishedAt && status === 'published') warnings.push('Published date is missing; legacy article metadata may be incomplete.')

  return {
    ref,
    title: title || 'Untitled article',
    source,
    status,
    contentLength: content.length,
    blockers,
    reviewItems,
    warnings,
    readiness: blockers.length > 0 ? 'blocked' : reviewItems.length > 0 ? 'needs_review' : 'ready',
  }
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function listSection(title: string, values: string[]): string[] {
  if (values.length === 0) return []
  return ['', `<b>${title}</b>`, ...values.map((value) => `- ${escapeHtml(value)}`)]
}

export function formatBlogPublishingPreflight(preflight: BlogPreflight): string {
  const label = preflight.readiness === 'ready'
    ? 'Ready for manual editorial publication review'
    : preflight.readiness === 'needs_review'
      ? 'Manual editorial review required'
      : 'Publication blocked'

  return [
    '<b>Blog Editorial Preflight</b>',
    `<b>${escapeHtml(preflight.ref)}</b> ${escapeHtml(preflight.title)}`,
    `state: <b>${escapeHtml(preflight.status)}</b>; source: ${escapeHtml(preflight.source)}; readable body: ${preflight.contentLength} chars`,
    `result: <b>${escapeHtml(label)}</b>`,
    ...listSection('Blockers', preflight.blockers),
    ...listSection('Review before publishing', preflight.reviewItems),
    ...listSection('Warnings', preflight.warnings),
    '',
    '<i>Read-only: this command never changes the article, approves claims, publishes, calls a provider, or spends.</i>',
  ].join('\n')
}

export async function findBlogPostForPreflight(payload: any, ref: string): Promise<Record<string, any> | null> {
  const normalizedRef = ref.trim()
  if (!normalizedRef) return null

  if (/^\d+$/.test(normalizedRef)) {
    try {
      const post = await payload.findByID({ collection: 'blog-posts', id: normalizedRef, depth: 1 })
      if (post) return post as Record<string, any>
    } catch {
      // Fall through to slug lookup for a numeric slug.
    }
  }

  const result = await payload.find({
    collection: 'blog-posts',
    where: { slug: { equals: normalizedRef } },
    limit: 1,
    depth: 1,
  })
  return (result.docs?.[0] as Record<string, any> | undefined) ?? null
}
