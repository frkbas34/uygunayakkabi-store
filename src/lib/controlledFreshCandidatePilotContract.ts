import { createHash } from 'node:crypto'
import { AsyncLocalStorage } from 'node:async_hooks'
import path from 'node:path'
import type { ControlledFreshCandidateOperationScope } from './controlledFreshCandidateCreation'

export const CONTROLLED_FRESH_CANDIDATE_PILOT_MANIFEST_VERSION =
  'controlled-fresh-candidate-pilot-manifest/v2' as const
export const CONTROLLED_FRESH_CANDIDATE_OWNER_INPUT_VERSION =
  CONTROLLED_FRESH_CANDIDATE_PILOT_MANIFEST_VERSION
export const CONTROLLED_FRESH_CANDIDATE_OWNER_AUTHORIZATION_VERSION =
  'controlled-fresh-candidate-owner-authorization/v1' as const
export const CONTROLLED_FRESH_CANDIDATE_MAX_AUTHORIZATION_MS = 30 * 60 * 1_000
export const CONTROLLED_FRESH_CANDIDATE_RESERVED_PRODUCT_ID = 349
export const CONTROLLED_FRESH_CANDIDATE_DATABASE_PARALLELISM = 0
export const CONTROLLED_FRESH_CANDIDATE_DATABASE_RETRY_BUDGET = 0

export const CONTROLLED_FRESH_CANDIDATE_CREATION_ENVELOPE = Object.freeze({
  localOperationPackages: 1,
  newProducts: 1,
  newMedia: 1,
  productImageRelationshipUpdates: 1,
  productFinalizationCasUpdates: 1,
  blobObjects: 4,
  existingProductMutations: 0,
  generatedOrEnhancedMedia: 0,
  mediaUpdates: 0,
  recordDeletes: 0,
  blobOverwrites: 0,
  blobDeletes: 0,
  retries: 0,
  replacementExecutions: 0,
} as const)

export const CONTROLLED_FRESH_CANDIDATE_EXTERNAL_EFFECT_ENVELOPE = Object.freeze({
  mediaGeneration: 0,
  providerCalls: 0,
  telegramMessages: 0,
  queueInsertions: 0,
  storefrontPublishing: 0,
  shopierSynchronizations: 0,
  advertisingActions: 0,
  customerDispatches: 0,
  blobWrites: 4,
} as const)

// Static derivation from the fixed one-candidate runtime call graph:
// 8 adapter bootstrap statements; 11 bounded application reads at no more than
// 2 statements each; 4 bounded application mutations at no more than 4
// statements each; 4 transactions with BEGIN plus COMMIT/ROLLBACK; and the 12
// direct finalization guards (3 SET, 7 LOCK, 1 row lock, 1 queue census).
export const CONTROLLED_FRESH_CANDIDATE_SQL_DERIVATION = Object.freeze({
  adapterBootstrap: 8,
  applicationReads: 11 * 2,
  applicationMutations: 4 * 4,
  transactionControl: 4 * 2,
  finalizationGuards: 12,
} as const)

export const CONTROLLED_FRESH_CANDIDATE_RUNTIME_MAXIMUMS = Object.freeze({
  poolConstructions: 1,
  clientConstructions: 1,
  connectionAttempts: 1,
  checkedOutClients: 1,
  transactions: 4,
  sqlStatements: Object.values(CONTROLLED_FRESH_CANDIDATE_SQL_DERIVATION)
    .reduce((total, count) => total + count, 0),
  // Creation uses 11; the separate two-snapshot verifier uses at most 14.
  applicationReads: 14,
  applicationMutations: 4,
  productCalls: 9,
  mediaCalls: 3,
  blobCalls: 4,
  blobObservations: 20,
  cleanupOperations: 8,
  setupOperations: 5,
} as const)

export type ControlledFreshCandidateRuntimeCounter = keyof typeof CONTROLLED_FRESH_CANDIDATE_RUNTIME_MAXIMUMS
export type ControlledFreshCandidateRuntimeCounts = Record<ControlledFreshCandidateRuntimeCounter, number>
export type ControlledFreshCandidateRuntimeBudgetReport = Readonly<{
  identity: string
  actual: ControlledFreshCandidateRuntimeCounts
  maximum: typeof CONTROLLED_FRESH_CANDIDATE_RUNTIME_MAXIMUMS
  completionCertainty: 'OBSERVED' | 'UNKNOWN'
}>

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function exactOwnKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  return JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort())
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue)
  if (!isPlainRecord(value)) return value
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]))
}

export function controlledFreshCandidateCanonicalJson(value: unknown): string {
  return JSON.stringify(stableValue(value))
}

export function controlledFreshCandidatePilotDigest(value: unknown): string {
  return createHash('sha256').update(controlledFreshCandidateCanonicalJson(value)).digest('hex')
}

export const CONTROLLED_FRESH_CANDIDATE_RUNTIME_BUDGET_IDENTITY =
  `cfc-runtime-budget-${controlledFreshCandidatePilotDigest({
    databaseParallelism: CONTROLLED_FRESH_CANDIDATE_DATABASE_PARALLELISM,
    databaseRetryBudget: CONTROLLED_FRESH_CANDIDATE_DATABASE_RETRY_BUDGET,
    derivation: CONTROLLED_FRESH_CANDIDATE_SQL_DERIVATION,
    maximum: CONTROLLED_FRESH_CANDIDATE_RUNTIME_MAXIMUMS,
  })}` as const

export type ControlledFreshCandidatePilotManifest = {
  version: typeof CONTROLLED_FRESH_CANDIDATE_PILOT_MANIFEST_VERSION
  candidateIdentity: string
  manifestDigest: string
  existingProductId: null
  stockCandidate: string
  title: string
  positivePrice: number
  provenance: string
  original: {
    identity: string
    filename: string
    contentDigest: string
    mimeType: 'image/jpeg' | 'image/png' | 'image/webp'
    width: number
    height: number
  }
  declaredBlobObjectMaximum: 4
  creationEnvelope: typeof CONTROLLED_FRESH_CANDIDATE_CREATION_ENVELOPE
  externalEffectEnvelope: typeof CONTROLLED_FRESH_CANDIDATE_EXTERNAL_EFFECT_ENVELOPE
  runtimeBudgetIdentity: typeof CONTROLLED_FRESH_CANDIDATE_RUNTIME_BUDGET_IDENTITY
  exactCommitIdentity: string
  createdAt: string
  expiresAt: string
}

export type ControlledFreshCandidateOwnerInput = ControlledFreshCandidatePilotManifest & {
  originalPath: string
}

function exactTimestamp(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value)) return false
  const millis = Date.parse(value)
  return Number.isSafeInteger(millis) && new Date(millis).toISOString() === value
}

function exactSafeFilename(value: unknown): value is string {
  return typeof value === 'string'
    && value.length >= 3 && value.length <= 160
    && /^[a-z0-9][a-z0-9._-]+$/iu.test(value)
    && !value.includes('..')
    && path.posix.basename(value) === value
}

function exactIdentity(value: unknown): value is string {
  return typeof value === 'string' && /^[a-z0-9][a-z0-9:_-]{7,127}$/iu.test(value)
}

function exactDigest(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{64}$/u.test(value)
}

function exactEnvelope(value: unknown, expected: Record<string, number>): boolean {
  return isPlainRecord(value)
    && exactOwnKeys(value, Object.keys(expected))
    && Object.entries(expected).every(([key, count]) => value[key] === count)
}

export function controlledFreshCandidateManifestUnsigned(
  manifest: ControlledFreshCandidatePilotManifest,
): Omit<ControlledFreshCandidatePilotManifest, 'manifestDigest'> {
  const unsigned = { ...manifest } as Partial<ControlledFreshCandidatePilotManifest>
  delete unsigned.manifestDigest
  return unsigned as Omit<ControlledFreshCandidatePilotManifest, 'manifestDigest'>
}

export function validateControlledFreshCandidatePilotManifest(
  value: unknown,
  options: { now?: number; expectedCommitIdentity?: string } = {},
): value is ControlledFreshCandidatePilotManifest {
  if (!isPlainRecord(value) || !exactOwnKeys(value, [
    'version', 'candidateIdentity', 'manifestDigest', 'existingProductId', 'stockCandidate',
    'title', 'positivePrice', 'provenance', 'original', 'declaredBlobObjectMaximum',
    'creationEnvelope', 'externalEffectEnvelope', 'runtimeBudgetIdentity',
    'exactCommitIdentity', 'createdAt', 'expiresAt',
  ])) return false
  if (!isPlainRecord(value.original) || !exactOwnKeys(value.original, [
    'identity', 'filename', 'contentDigest', 'mimeType', 'width', 'height',
  ])) return false
  if (!exactEnvelope(value.creationEnvelope, CONTROLLED_FRESH_CANDIDATE_CREATION_ENVELOPE)) return false
  if (!exactEnvelope(value.externalEffectEnvelope, CONTROLLED_FRESH_CANDIDATE_EXTERNAL_EFFECT_ENVELOPE)) return false
  const createdAt = Date.parse(String(value.createdAt))
  const expiresAt = Date.parse(String(value.expiresAt))
  const now = options.now ?? Date.now()
  const candidate = value as unknown as ControlledFreshCandidatePilotManifest
  return value.version === CONTROLLED_FRESH_CANDIDATE_PILOT_MANIFEST_VERSION
    && exactIdentity(value.candidateIdentity)
    && exactDigest(value.manifestDigest)
    && value.existingProductId === null
    && typeof value.stockCandidate === 'string' && /^SN\d{4}$/u.test(value.stockCandidate)
    && typeof value.title === 'string' && value.title.trim() === value.title
    && value.title.length >= 1 && value.title.length <= 160
    && typeof value.positivePrice === 'number' && Number.isFinite(value.positivePrice)
    && !Object.is(value.positivePrice, -0) && value.positivePrice > 0
    && typeof value.provenance === 'string' && value.provenance.trim() === value.provenance
    && value.provenance.length >= 1 && value.provenance.length <= 1_000
    && exactIdentity(value.original.identity)
    && exactSafeFilename(value.original.filename)
    && exactDigest(value.original.contentDigest)
    && ['image/jpeg', 'image/png', 'image/webp'].includes(String(value.original.mimeType))
    && typeof value.original.width === 'number' && Number.isSafeInteger(value.original.width)
    && value.original.width > 0 && value.original.width <= 20_000
    && typeof value.original.height === 'number' && Number.isSafeInteger(value.original.height)
    && value.original.height > 0 && value.original.height <= 20_000
    && value.original.width * value.original.height <= 40_000_000
    && value.declaredBlobObjectMaximum === 4
    && value.runtimeBudgetIdentity === CONTROLLED_FRESH_CANDIDATE_RUNTIME_BUDGET_IDENTITY
    && typeof value.exactCommitIdentity === 'string' && /^[0-9a-f]{40}$/u.test(value.exactCommitIdentity)
    && (options.expectedCommitIdentity === undefined || value.exactCommitIdentity === options.expectedCommitIdentity)
    && exactTimestamp(value.createdAt) && exactTimestamp(value.expiresAt)
    && createdAt <= now && now < expiresAt
    && expiresAt - createdAt > 0
    && expiresAt - createdAt <= CONTROLLED_FRESH_CANDIDATE_MAX_AUTHORIZATION_MS
    && controlledFreshCandidatePilotDigest(controlledFreshCandidateManifestUnsigned(candidate)) === value.manifestDigest
}

export function validateControlledFreshCandidateOwnerInput(
  value: unknown,
  options: { now?: number; expectedCommitIdentity?: string } = {},
): value is ControlledFreshCandidateOwnerInput {
  if (!isPlainRecord(value) || !exactOwnKeys(value, [
    'version', 'candidateIdentity', 'manifestDigest', 'existingProductId', 'stockCandidate',
    'title', 'positivePrice', 'provenance', 'original', 'originalPath',
    'declaredBlobObjectMaximum', 'creationEnvelope', 'externalEffectEnvelope',
    'runtimeBudgetIdentity', 'exactCommitIdentity', 'createdAt', 'expiresAt',
  ])) return false
  const { originalPath, ...manifest } = value
  return typeof originalPath === 'string'
    && path.posix.isAbsolute(originalPath)
    && path.posix.normalize(originalPath) === originalPath
    && !originalPath.includes('\0')
    && isPlainRecord(value.original)
    && path.posix.basename(originalPath) === value.original.filename
    && validateControlledFreshCandidatePilotManifest(manifest, options)
}

function emptyCounts(): ControlledFreshCandidateRuntimeCounts {
  return Object.fromEntries(
    Object.keys(CONTROLLED_FRESH_CANDIDATE_RUNTIME_MAXIMUMS).map((key) => [key, 0]),
  ) as ControlledFreshCandidateRuntimeCounts
}

function sqlText(value: unknown): string | null {
  if (typeof value === 'string') return value
  if (isPlainRecord(value) && typeof value.text === 'string') return value.text
  return null
}

export type ControlledFreshCandidateSqlPhase = {
  phase: 'bootstrap' | 'stock' | 'begin' | 'commit' | 'rollback' | 'product-create' | 'media-create' | 'relationship' | 'finalize' | 'read' | 'gallery' | 'queue'
  table?: string
  identity?: number | string
  identityField?: 'id' | 'product_id'
  data?: Record<string, unknown>
  maximumStatements?: number
}

export const CONTROLLED_FRESH_CANDIDATE_QUEUE_RECEIPTS_SQL = `
WITH target_receipts AS (
  SELECT pj.id, pj.task_slug, pj.input, pj.processing, pj.completed_at, pj.has_error, pj.wait_until
  FROM payload_jobs pj
  INNER JOIN image_generation_jobs igj
    ON igj.id::text = pj.input ->> 'jobId'
  WHERE pj.task_slug = 'image-gen'
    AND igj.product_id = $1
), page_receipts AS (
  SELECT id, task_slug, input, processing, completed_at, has_error, wait_until
  FROM target_receipts
  ORDER BY id ASC
  LIMIT $2 OFFSET $3
)
SELECT
  (SELECT count(*)::text FROM target_receipts) AS total_docs,
  COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', id,
        'taskSlug', task_slug,
        'input', jsonb_build_object('jobId', input ->> 'jobId'),
        'processing', processing,
        'completedAt', completed_at,
        'hasError', has_error,
        'waitUntil', wait_until
      ) ORDER BY id ASC
    ),
    '[]'::jsonb
  ) AS docs
FROM page_receipts
`.trim()

function flattenedSqlData(value: Record<string, unknown>, prefix = '', columns?: ReadonlySet<string>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, entry] of Object.entries(value)) {
    const name = prefix + key.replace(/[A-Z]/gu, (letter) => `_${letter.toLowerCase()}`)
    if (columns?.has(name)) result[name] = entry
    else if (isPlainRecord(entry)) Object.assign(result, flattenedSqlData(entry, `${name}_`, columns))
    else if (!Array.isArray(entry)) result[name] = entry
  }
  return result
}

function mainSqlWhere(text: string): string | null {
  let depth = 0
  let quote: string | null = null
  let start = -1
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]
    if (quote) {
      if (character === quote) {
        if (text[index + 1] === quote) index += 1
        else quote = null
      }
      continue
    }
    if (character === '"' || character === "'") { quote = character; continue }
    if (character === '(') depth += 1
    if (character === ')') { depth -= 1; if (depth < 0) return null }
    if (depth === 0 && text.slice(index, index + 7) === ' where ') start = index
  }
  return depth === 0 && !quote && start >= 0 ? text.slice(start) : null
}

function exactInstalledSelect(text: string, values: readonly unknown[], spec: ControlledFreshCandidateSqlPhase,
  columns: ReadonlyMap<string, ReadonlySet<string>>, identity: number | string, primary: string): boolean {
  // The only installed relational subqueries permitted are Payload's fixed,
  // parent-correlated JSON array loaders. Reconstruct their complete grammar;
  // never accept an arbitrary nested SELECT or a user-supplied expression.
  const relations: Readonly<Record<string, { table: string; parent: string; order: string; fields: string[] }>> = {
    products_images: { table: 'products_images', parent: '_parent_id', order: '_order', fields: ['_order', 'id', 'image_id'] },
    products_generativegallery: { table: 'products_generative_gallery', parent: '_parent_id', order: '_order', fields: ['_order', 'id', 'image_id'] },
    products_imagequality_defectflags: { table: 'products_image_quality_defect_flags', parent: 'parent_id', order: 'order', fields: ['value'] },
    products_channeltargets: { table: 'products_channel_targets', parent: 'parent_id', order: 'order', fields: ['value'] },
    products_storysettings_storytargets: { table: 'products_story_settings_story_targets', parent: 'parent_id', order: 'order', fields: ['value'] },
    products__rels: { table: 'products_rels', parent: 'parent_id', order: 'order', fields: ['order', 'path', 'variants_id'] },
  }
  let outer = text
  const loaded = new Set<string>()
  for (const [alias, relation] of Object.entries(relations)) {
    const field = (name: string) => `"${alias}"."${name}"`
    const fragment = ` left join lateral (select coalesce(json_agg(json_build_array(${relation.fields.map(field).join(', ')}) order by ${field(relation.order)} asc), '[]'::json) as "data" from (select * from "${relation.table}" "${alias}" where ${field(relation.parent)} = "products"."id" order by ${field(relation.order)} asc) "${alias}") "${alias}" on true`
    if (outer.includes(fragment)) {
      if (primary !== 'products' || [...relation.fields, relation.parent, relation.order].some((name) => !columns.get(relation.table)?.has(name))) return false
      outer = outer.replace(fragment, '')
      loaded.add(alias)
    }
  }
  const gallery = spec.phase === 'gallery'
  const galleryJoin = ' left join "products_generative_gallery" on "products"."id" = "products_generative_gallery"."_parent_id"'
  if (gallery) {
    if (!outer.includes(galleryJoin) || primary !== 'products' || loaded.size) return false
    outer = outer.replace(galleryJoin, '')
  }
  const match = outer.match(/^select (.+) from "([a-z_][a-z0-9_]*)"(?: "\2")? where (.+)$/u)
  if (!match || match[2] !== primary) return false
  const projection = match[1].replace(/^distinct /u, '')
  const count = projection === 'count(*)' || projection === `count(distinct "${primary}"."id")` || projection === `count("${primary}"."id")`
  if (!count && !projection.split(', ').every((entry) => {
    const column = entry.match(/^(?:"([a-z_][a-z0-9_]*)"\.)?"([a-z_][a-z0-9_]*)"(?: as "([a-z_][a-z0-9_]*)")?$/u)
    if (!column) return false
    if (column[1] && loaded.has(column[1])) return column[2] === 'data' && typeof column[3] === 'string'
    return (!column[1] || column[1] === primary) && !column[3] && columns.get(primary)?.has(column[2]) === true
  })) return false
  const key = spec.phase === 'media-create' ? 'filename' : spec.phase === 'stock' ? 'stock_number'
    : gallery ? 'image_id' : spec.identityField ?? (primary === 'products' ? 'id' : 'product_id')
  const owner = gallery ? 'products_generative_gallery' : primary
  const tail = match[3].match(new RegExp(`^\\(?\\s*(?:"${owner}"\\.)?"${key}" (?:= \\$(\\d+)|in \\(\\$(\\d+)\\))\\s*\\)?(?: order by (?:"${primary}"\\.)?"(id|created_at)" (asc|desc)(?:, "${primary}"\\."created_at" desc)?)?(?: limit \\$(\\d+))?(?: offset \\$(\\d+))?(?: for update)?$`, 'u'))
  if (!tail || values[Number(tail[1] ?? tail[2]) - 1] !== identity) return false
  const used = new Set([Number(tail[1] ?? tail[2])])
  if (tail[5]) {
    const limit = Number(tail[5]); used.add(limit)
    if (count || !Number.isSafeInteger(values[limit - 1]) || Number(values[limit - 1]) < 1 || Number(values[limit - 1]) > 100) return false
  } else if (!count && !text.endsWith(' for update')) return false
  if (tail[6]) { const offset = Number(tail[6]); used.add(offset); if (values[offset - 1] !== 0) return false }
  return used.size === values.length
}

// This is deliberately a restricted installed-ORM grammar, not a SQL prefix
// allowlist. Unknown syntax, columns, functions and adapter changes stop before
// the wire. Every statement additionally needs a live call-site phase capability.
function structuralSql(text: string, values: readonly unknown[], spec: ControlledFreshCandidateSqlPhase,
  columns: ReadonlyMap<string, ReadonlySet<string>>, productId: number | null, mediaId: number | null,
  encoders: ReadonlyMap<string, ReadonlyMap<string, (value: unknown) => unknown>>,
): boolean {
  if (!text || text.length > 65_536 || /--|\/\*|\*\/|;|\0|\$\$/u.test(text)) return false
  const placeholders = [...text.matchAll(/\$(\d+)/gu)].map((match) => Number(match[1]))
  const unique = [...new Set(placeholders)].sort((a, b) => a - b)
  if (unique.length !== values.length || unique.some((number, index) => number !== index + 1)) return false
  if (values.some((value) => value === undefined || (typeof value === 'number' && !Number.isFinite(value)))) return false
  const normalized = text.trim().replace(/\s+/gu, ' ').toLowerCase()
  if (spec.phase === 'queue' && text.trim().replace(/\s+/gu, ' ') === CONTROLLED_FRESH_CANDIDATE_QUEUE_RECEIPTS_SQL.replace(/\s+/gu, ' ')) {
    return values.length === 3 && values[0] === productId && productId !== null
      && values[1] === 100 && values[2] === 0
  }
  if (spec.phase === 'queue' && normalized === `select count(*)::text as total_docs from "payload_jobs" inner join "image_generation_jobs" on "image_generation_jobs"."id"::text = ("payload_jobs"."input" ->> 'jobid') where "payload_jobs"."task_slug" = 'image-gen' and "image_generation_jobs"."product_id" = $1`) {
    return productId !== null && values.length === 1 && values[0] === productId
  }
  if (spec.phase === 'bootstrap') return normalized === 'select 1' && values.length === 0
  if (['begin', 'media-create', 'relationship', 'finalize'].includes(spec.phase) && /^begin(?: isolation level read committed(?: read write)?(?: not deferrable)?)?$/u.test(normalized)) return values.length === 0
  if (['media-create', 'relationship', 'finalize'].includes(spec.phase) && /^(?:commit|rollback)$/u.test(normalized)) return values.length === 0
  if (spec.phase === 'commit' || spec.phase === 'rollback') return normalized === spec.phase && values.length === 0
  if (spec.phase === 'finalize' && ["set local statement_timeout = '40000ms'", "set local lock_timeout = '10000ms'", "set local idle_in_transaction_session_timeout = '40000ms'"].includes(normalized)) return values.length === 0
  if (spec.phase === 'finalize' && /^lock table "(?:products|products_rels|media|image_generation_jobs|payload_jobs|bot_events|story_jobs)" in share row exclusive mode$/u.test(normalized)) return values.length === 0
  if (/\b(?:with|union|intersect|except|copy|call|do|merge|alter|create|drop|truncate|grant|revoke|vacuum|analyze|on conflict)\b/u.test(normalized)) return false
  const safeFunctions = new Set(['count', 'coalesce', 'json_agg', 'json_build_array', 'json_build_object', 'jsonb_agg', 'jsonb_build_array', 'row_to_json'])
  const syntaxParentheses = new Set(['select', 'from', 'where', 'and', 'or', 'in', 'exists', 'values', 'as', 'filter', 'lateral'])
  if (/\b(?:pg_catalog|information_schema)\b/u.test(normalized)) return false
  for (const match of normalized.matchAll(/(?:"([a-z_][a-z0-9_]*)"|\b([a-z_][a-z0-9_]*))\s*\(/gu)) {
    const name = match[1] ?? match[2]
    const insertTarget = normalized.startsWith(`insert into "${name}" (`) && match.index === 'insert into '.length
    if (!safeFunctions.has(name) && !syntaxParentheses.has(name) && !insertTarget) return false
  }
  const targets = [...normalized.matchAll(/\b(?:from|join|into|update)\s+(?:"public"\.)?"([a-z_][a-z0-9_]*)"/gu)].map((match) => match[1])
  if (targets.length === 0 || targets.some((table) => !columns.has(table))) return false
  const primary = spec.table ?? (spec.phase === 'media-create' ? 'media' : 'products')
  const permitted = (table: string) => table === primary
    || (primary === 'products' && /^products_(?:rels|images|generative_gallery|channel_targets|image_quality_defect_flags|story_settings_story_targets)$/u.test(table))
    || ((spec.phase === 'gallery' || spec.phase === 'relationship') && table === 'products_rels')
    || (spec.phase === 'queue' && ['payload_jobs', 'image_generation_jobs'].includes(table))
  if (targets.some((table) => !permitted(table))) return false
  const verb = normalized.match(/^([a-z]+)/u)?.[1]
  if (verb === 'select') {
    if (!['stock', 'read', 'gallery', 'queue', 'finalize', 'relationship', 'media-create', 'product-create'].includes(spec.phase)) return false
    const identity = spec.phase === 'media-create' ? spec.data?.filename : spec.identity ?? productId
    if (typeof identity !== 'string' && typeof identity !== 'number' || identity === 349) return false
    // A bound equality on the owning key must constrain the main statement;
    // a literal, subquery-only guard, OR escape or unrestricted read is refused.
    if (/\bor\b/u.test(normalized)) return false
    const key = spec.phase === 'media-create' ? 'filename' : spec.phase === 'stock' ? 'stock_number'
      : spec.phase === 'gallery' ? 'image_id'
        : spec.identityField ?? (primary === 'products' ? 'id' : 'product_id')
    const predicate = new RegExp(`(?:"[a-z_][a-z0-9_]*"\\.)?"${key}"\\s*(?:=\\s*|in\\s*\\()\\$(\\d+)(?=\\s*(?:\\)|and\\b|order\\b|limit\\b|offset\\b|for\\b|$))`, 'u')
    const where = mainSqlWhere(normalized)
    if (!where || /\bselect\b/u.test(where)) return false
    const match = where.match(predicate)
    if (!match || values[Number(match[1]) - 1] !== identity) return false
    return exactInstalledSelect(normalized, values, spec, columns, identity, primary)
  }
  if (!['insert', 'update', 'delete'].includes(verb ?? '')) return false
  if (!['product-create', 'media-create', 'relationship', 'finalize'].includes(spec.phase)) return false
  const target = targets[0]
  const returning = normalized.split(' returning ')
  if (returning.length > 2 || returning.length === 2 && !returning[1].split(', ').every((name) => /^"[a-z_][a-z0-9_]*"$/u.test(name) && columns.get(target)?.has(name.slice(1, -1)))) return false
  if (verb === 'delete') {
    return spec.phase === 'relationship' && target === 'products_images'
      && /^delete from "products_images" where "products_images"\."_parent_id" = \$1$/u.test(normalized)
      && values.length === 1 && values[0] === productId && productId !== null
  }
  if (verb === 'update' && (target !== 'products' || !['relationship', 'finalize'].includes(spec.phase))) return false
  if (verb === 'insert' && !(spec.phase === 'product-create' && target === 'products'
    || spec.phase === 'media-create' && target === 'media'
    || spec.phase === 'relationship' && ['products_images', 'products_rels'].includes(target))) return false
  const data = flattenedSqlData(spec.data ?? {}, '', columns.get(target))
  const matchesData = (name: string, value: unknown): boolean => {
    if (!Object.hasOwn(data, name)) return false
    try {
      const encode = encoders.get(target)?.get(name)
      return controlledFreshCandidateCanonicalJson(value) === controlledFreshCandidateCanonicalJson(encode ? encode(data[name]) : data[name])
    } catch { return false }
  }
  if (verb === 'update') {
    const where = normalized.match(/ where "(?:products"\.)?"?id"? = \$(\d+)(?: returning .+)?$/u)
    if (!where || values[Number(where[1]) - 1] !== productId) return false
    const assignments = normalized.slice(normalized.indexOf(' set ') + 5, normalized.indexOf(' where ')).split(', ')
    return assignments.length > 0 && assignments.every((assignment) => {
      const match = assignment.match(/^"([a-z_][a-z0-9_]*)" = \$(\d+)$/u)
      if (!match || !columns.get(target)?.has(match[1])) return false
      const value = values[Number(match[2]) - 1]
      if (match[1] === 'updated_at') return typeof value === 'string' && exactTimestamp(value) && Math.abs(Date.now() - Date.parse(value)) <= 45_000
      return matchesData(match[1], value)
    })
  }
  const insert = normalized.match(/^insert into "([a-z_][a-z0-9_]*)" \(([^)]+)\) values \(([^)]+)\)(?: returning .+)?$/u)
  if (!insert) return false
  const names = insert[2].split(', ').map((name) => name.replaceAll('"', ''))
  const expressions = insert[3].split(', ')
  if (names.length !== expressions.length || new Set(names).size !== names.length) return false
  return names.every((name, index) => {
    if (!columns.get(target)?.has(name)) return false
    const expression = expressions[index]
    if (expression === 'default') return name === 'id' || !Object.hasOwn(data, name)
    const match = expression.match(/^\$(\d+)$/u)
    if (!match) return false
    const value = values[Number(match[1]) - 1]
    if (name === 'id' && (target === 'products' || target === 'media')) return false
    if (name === '_parent_id' || name === 'parent_id' || name === 'product_id') return value === productId && productId !== null
    if (name === 'image_id') return spec.phase === 'relationship' && target === 'products_images' && value === mediaId && mediaId !== null
    if (name === 'path') return spec.phase === 'relationship' && value === 'images.image'
    if (name === '_order' || name === 'order') return value === 1
    if (name === 'id' && target !== 'products' && target !== 'media') return typeof value === 'string' && /^[a-f0-9-]{36}$/u.test(value)
    if (name === 'created_at' || name === 'updated_at') return typeof value === 'string' && exactTimestamp(value) && Math.abs(Date.now() - Date.parse(value)) <= 45_000
    if (Object.hasOwn(data, name)) return matchesData(name, value)
    return value === null
  })
}

export type ControlledFreshCandidateRuntimeBudget = ReturnType<typeof createControlledFreshCandidateRuntimeBudget>
const scopeBudgets = new WeakMap<ControlledFreshCandidateOperationScope, ControlledFreshCandidateRuntimeBudget>()

export function controlledFreshCandidateBudgetForScope(scope: ControlledFreshCandidateOperationScope) {
  let budget = scopeBudgets.get(scope)
  if (!budget) { budget = createControlledFreshCandidateRuntimeBudget(); scopeBudgets.set(scope, budget) }
  return budget
}
export function bindControlledFreshCandidateBudget(scope: ControlledFreshCandidateOperationScope, budget: ControlledFreshCandidateRuntimeBudget): void {
  const existing = scopeBudgets.get(scope)
  if (existing && existing !== budget) throw new Error('CONTROLLED_RUNTIME_BUDGET_REPLACEMENT_FORBIDDEN')
  scopeBudgets.set(scope, budget)
}

export function createControlledFreshCandidateRuntimeBudget() {
  const actual = emptyCounts()
  let checkedOut = 0
  let plusConfirmed = false
  let uncertain = false
  const phases = new AsyncLocalStorage<{ spec: ControlledFreshCandidateSqlPhase; actual: number; preparedData?: Record<string, unknown> }>()
  let sqlColumns: ReadonlyMap<string, ReadonlySet<string>> = new Map()
  let sqlEncoders: ReadonlyMap<string, ReadonlyMap<string, (value: unknown) => unknown>> = new Map()
  let productId: number | null = null
  let mediaId: number | null = null
  let transactionOpen = false
  const writes = new Set<string>()
  const increment = (counter: ControlledFreshCandidateRuntimeCounter): void => {
    const next = actual[counter] + 1
    if (next > CONTROLLED_FRESH_CANDIDATE_RUNTIME_MAXIMUMS[counter]) {
      throw new Error('CONTROLLED_RUNTIME_BUDGET_EXHAUSTED')
    }
    actual[counter] = next
  }
  const requirePlus = (): void => {
    if (!plusConfirmed) throw new Error('CONTROLLED_RUNTIME_CHANNEL_BINDING_NOT_CONFIRMED')
  }
  return Object.freeze({
    capturePreparedDocument(data: Record<string, unknown>) {
      const phase = phases.getStore()
      if (!phase || !['product-create', 'media-create'].includes(phase.spec.phase) || phase.preparedData) throw new Error('CONTROLLED_SQL_PREPARED_DOCUMENT_FORBIDDEN')
      const expected = flattenedSqlData(phase.spec.data ?? {})
      const prepared = flattenedSqlData(data)
      if (Object.entries(expected).some(([key, value]) => controlledFreshCandidateCanonicalJson(prepared[key]) !== controlledFreshCandidateCanonicalJson(value))) {
        throw new Error('CONTROLLED_SQL_PREPARED_DOCUMENT_MISMATCH')
      }
      phase.preparedData = structuredClone(data)
    },
    registerSqlColumns(columns: ReadonlyMap<string, ReadonlySet<string>>, encoders: typeof sqlEncoders = new Map()) {
      if (sqlColumns.size || !columns.size) throw new Error('CONTROLLED_SQL_SCHEMA_REPLACEMENT_FORBIDDEN')
      sqlColumns = new Map([...columns].map(([table, names]) => [table, new Set(names)]))
      sqlEncoders = new Map([...encoders].map(([table, names]) => [table, new Map(names)]))
    },
    recordCreatedIdentity(collection: 'products' | 'media', identity: unknown) {
      if (typeof identity !== 'number' || !Number.isSafeInteger(identity) || identity <= 0 || identity === 349
        || (collection === 'products' ? productId !== null : mediaId !== null || productId === null)) throw new Error('CONTROLLED_SQL_CREATED_IDENTITY_INVALID')
      if (collection === 'products') productId = identity
      else mediaId = identity
    },
    withSqlPhase<T>(spec: ControlledFreshCandidateSqlPhase, operation: () => Promise<T>): Promise<T> {
      if (spec.maximumStatements !== undefined && (!Number.isSafeInteger(spec.maximumStatements) || spec.maximumStatements < 1 || spec.maximumStatements > 14)) throw new Error('CONTROLLED_SQL_PHASE_INVALID')
      const expectedIdentity = spec.phase === 'gallery' || spec.phase === 'read' && spec.table === 'media' && spec.identityField === 'id' ? mediaId : productId
      if (spec.identity === 349 || typeof spec.identity === 'number' && spec.identity !== expectedIdentity) throw new Error('CONTROLLED_SQL_FOREIGN_IDENTITY')
      return phases.run({ spec: Object.freeze({ ...spec, data: spec.data ? structuredClone(spec.data) : undefined }), actual: 0 }, operation)
    },
    poolConstructed: () => increment('poolConstructions'),
    clientConstructed: () => increment('clientConstructions'),
    connectionAttempted: () => increment('connectionAttempts'),
    clientAcquired() {
      const next = checkedOut + 1
      if (next > CONTROLLED_FRESH_CANDIDATE_RUNTIME_MAXIMUMS.checkedOutClients) {
        throw new Error('CONTROLLED_RUNTIME_BUDGET_EXHAUSTED')
      }
      checkedOut = next
      actual.checkedOutClients = Math.max(actual.checkedOutClients, checkedOut)
    },
    clientReleased() { checkedOut = Math.max(0, checkedOut - 1) },
    channelBindingConfirmed() { plusConfirmed = true },
    assertChannelBindingConfirmed: requirePlus,
    sql(value: unknown) {
      const text = sqlText(value)
      const phase = phases.getStore()
      const values = isPlainRecord(value) && Array.isArray(value.values) ? value.values : []
      if (!text || !phase || !structuralSql(text, values, { ...phase.spec, data: phase.preparedData ?? phase.spec.data }, sqlColumns, productId, mediaId, sqlEncoders)
        || phase.actual >= (phase.spec.maximumStatements ?? (phase.spec.phase === 'read' || phase.spec.phase === 'stock' ? 2 : 4))) throw new Error('CONTROLLED_RUNTIME_SQL_FORBIDDEN')
      const verb = text.trim().match(/^([a-z]+)/iu)?.[1]?.toUpperCase()
      requirePlus()
      if (verb === 'BEGIN') {
        if (transactionOpen) throw new Error('CONTROLLED_RUNTIME_SQL_FORBIDDEN')
        increment('transactions'); transactionOpen = true
      }
      if (verb === 'COMMIT' || verb === 'ROLLBACK') {
        if (!transactionOpen) throw new Error('CONTROLLED_RUNTIME_SQL_FORBIDDEN')
        transactionOpen = false
      }
      if ((verb === 'INSERT' || verb === 'UPDATE' || verb === 'DELETE' || verb === 'LOCK' || verb === 'SET') && !transactionOpen) throw new Error('CONTROLLED_RUNTIME_SQL_FORBIDDEN')
      if (verb === 'INSERT' || verb === 'UPDATE' || verb === 'DELETE') {
        const target = text.toLowerCase().match(/^(?:insert into|update|delete from) "([a-z_][a-z0-9_]*)"/u)?.[1]
        const key = `${phase.spec.phase}:${verb}:${target}`
        if (writes.has(key) || verb === 'DELETE') throw new Error('CONTROLLED_RUNTIME_SQL_FORBIDDEN')
        writes.add(key)
      }
      phase.actual += 1
      increment('sqlStatements')
    },
    applicationRead(collection: string) {
      requirePlus()
      increment('applicationReads')
      if (collection === 'products') increment('productCalls')
      if (collection === 'media') increment('mediaCalls')
    },
    applicationMutation(collection: string) {
      requirePlus()
      increment('applicationMutations')
      if (collection === 'products') increment('productCalls')
      if (collection === 'media') increment('mediaCalls')
    },
    blobCall() { requirePlus(); increment('blobCalls') },
    blobObservation() { requirePlus(); increment('blobObservations') },
    setup() { increment('setupOperations') },
    cleanup() {
      // Cleanup must still be attempted when an unexpected extra resource was
      // observed. Preserve its actual attempt count and terminal uncertainty.
      actual.cleanupOperations += 1
      if (actual.cleanupOperations > CONTROLLED_FRESH_CANDIDATE_RUNTIME_MAXIMUMS.cleanupOperations) uncertain = true
    },
    markUncertain() { uncertain = true },
    report(): ControlledFreshCandidateRuntimeBudgetReport {
      return Object.freeze({
        identity: CONTROLLED_FRESH_CANDIDATE_RUNTIME_BUDGET_IDENTITY,
        actual: Object.freeze({ ...actual }),
        maximum: CONTROLLED_FRESH_CANDIDATE_RUNTIME_MAXIMUMS,
        completionCertainty: uncertain ? 'UNKNOWN' : 'OBSERVED',
      })
    },
  })
}
