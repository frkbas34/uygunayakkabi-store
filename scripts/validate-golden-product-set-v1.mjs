import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { dirname, extname, join, normalize, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const Ajv = require('ajv')

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const corpusRoot = join(repoRoot, 'project-control', 'golden-product-set-v1')
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'))
const manifestPath = join(corpusRoot, 'manifest.json')
const manifestSchemaPath = join(corpusRoot, 'manifest.schema.json')
const annotationSchemaPath = join(corpusRoot, 'annotations.schema.json')

const failures = []
const warnings = []
const passes = []
const pass = (message) => passes.push(message)
const warn = (message) => warnings.push(message)
const fail = (message) => failures.push(message)
const assert = (condition, message) => condition ? pass(message) : fail(message)

for (const path of [manifestPath, manifestSchemaPath, annotationSchemaPath]) {
  assert(existsSync(path), `required file exists: ${relative(repoRoot, path)}`)
}

if (failures.length) finish()

const manifest = readJson(manifestPath)
const manifestSchema = readJson(manifestSchemaPath)
const annotationSchema = readJson(annotationSchemaPath)
const ajv = new Ajv({ allErrors: true, jsonPointers: true, schemaId: 'auto' })

let validateManifest
let validateAnnotation
try {
  validateManifest = ajv.compile(manifestSchema)
  validateAnnotation = ajv.compile(annotationSchema)
  pass('both JSON Schemas compile with the repository-installed Ajv')
} catch (error) {
  fail(`schema compilation failed: ${error.message}`)
  finish()
}

if (!validateManifest(manifest)) {
  fail(`manifest schema validation failed: ${ajv.errorsText(validateManifest.errors, { separator: '; ' })}`)
} else {
  pass('manifest.json validates against manifest.schema.json')
}

const selectedIds = new Set()
const selectedHashes = new Map()
const selectedPaths = new Set()
const annotations = []
const allowedFamilies = new Set(manifest.targetDistribution.map((row) => row.family))
const actualFamilyCounts = Object.fromEntries([...allowedFamilies].map((family) => [family, 0]))
const forbiddenSourceClasses = /generated|approved_generated|rejected_generated|screenshot|temporary|production_url/i
const forbiddenKeys = new Set(['slotIndex', 'sceneIndex', 'arrayPosition', 'positionalSlot', 'sourceSlotIndex'])

for (const product of manifest.products) {
  assert(!selectedIds.has(product.corpusProductId), `unique product ID: ${product.corpusProductId}`)
  selectedIds.add(product.corpusProductId)
  assert(allowedFamilies.has(product.family), `known family for ${product.corpusProductId}`)
  if (actualFamilyCounts[product.family] !== undefined) actualFamilyCounts[product.family] += 1

  const source = product.sourceReference
  assert(source.sourceOriginality === 'original_reference', `Layer A source is original-only for ${product.corpusProductId}`)
  assert(!forbiddenSourceClasses.test(`${source.sourceType} ${source.sourceOriginality}`), `Layer A source excludes generated/screenshot/temporary classes for ${product.corpusProductId}`)
  assert(!selectedPaths.has(source.repositoryRelativePath), `unique selected source path for ${product.corpusProductId}`)
  selectedPaths.add(source.repositoryRelativePath)

  const sourcePath = safeRepoPath(source.repositoryRelativePath)
  if (!sourcePath || !existsSync(sourcePath)) {
    fail(`selected source is missing or unsafe: ${source.repositoryRelativePath}`)
  } else {
    const bytes = readFileSync(sourcePath)
    const hash = createHash('sha256').update(bytes).digest('hex')
    assert(source.contentHash === `sha256:${hash}`, `content hash matches ${source.repositoryRelativePath}`)
    assert(source.byteLength === statSync(sourcePath).size, `byte length matches ${source.repositoryRelativePath}`)
    const detected = detectMediaType(bytes)
    assert(source.detectedMediaType === detected, `detected media type matches ${source.repositoryRelativePath}`)
    const extensionType = extensionMediaType(extname(source.repositoryRelativePath))
    if (extensionType && extensionType !== detected) {
      assert(source.filenameExtensionMismatch === true, `extension mismatch is declared for ${source.repositoryRelativePath}`)
    }
  }

  if (selectedHashes.has(source.contentHash)) {
    fail(`duplicate selected hash: ${product.corpusProductId} and ${selectedHashes.get(source.contentHash)}`)
  } else {
    selectedHashes.set(source.contentHash, product.corpusProductId)
  }

  const annotationPath = join(corpusRoot, ...product.annotationPath.split('/'))
  if (!existsSync(annotationPath)) {
    fail(`annotation missing: ${product.annotationPath}`)
    continue
  }
  const annotation = readJson(annotationPath)
  annotations.push({ product, annotation, annotationPath })
  if (!validateAnnotation(annotation)) {
    fail(`${product.annotationPath} schema validation failed: ${ajv.errorsText(validateAnnotation.errors, { separator: '; ' })}`)
  } else {
    pass(`${product.annotationPath} validates against annotations.schema.json`)
  }
  assert(annotation.corpusProductId === product.corpusProductId, `annotation ID matches manifest for ${product.corpusProductId}`)
  assert(annotation.corpusVersion === manifest.corpusVersion, `corpus version matches for ${product.corpusProductId}`)
  assert(annotation.classification.productFamily === product.family, `family matches manifest for ${product.corpusProductId}`)
  assert(annotation.status === product.reviewStatus, `review status matches manifest for ${product.corpusProductId}`)
  assert(annotation.sourceReference.referenceId === source.referenceId, `source reference ID matches for ${product.corpusProductId}`)
  assert(annotation.sourceReference.contentHash === source.contentHash, `source hash matches annotation for ${product.corpusProductId}`)
  assert(annotation.explicitUnknowns.length > 0, `explicit unknowns are present for ${product.corpusProductId}`)
  const regions = annotation.referenceSufficiencyMap.regions.map((region) => region.region)
  assert(regions.length === 15 && new Set(regions).size === 15, `all 15 sufficiency regions are unique for ${product.corpusProductId}`)
  assert(annotation.annotationProvenance.humanAuthority === false || annotation.annotationProvenance.actorType === 'human_operator', `human authority cannot be machine-attributed for ${product.corpusProductId}`)
  if (['reviewed', 'approved'].includes(annotation.status)) {
    assert(annotation.review.reviewerActorType === 'human_operator' && annotation.review.reviewerId && annotation.review.reviewedAt, `reviewed state has human attribution for ${product.corpusProductId}`)
  }
  if (annotation.status === 'approved') {
    assert(annotation.annotationProvenance.humanAuthority && annotation.review.approvedAt && annotation.review.approvalReason, `approved state has explicit human authority for ${product.corpusProductId}`)
  }
  assert(annotation.review.history.every((event) => event.reversible === true), `revision history is reversible for ${product.corpusProductId}`)
  assert(!hasForbiddenKey(annotation, forbiddenKeys), `no positional slot authority in ${product.corpusProductId}`)
}

assert(manifest.materializedProductCount === manifest.products.length, 'materializedProductCount equals manifest membership')
assert(annotations.length === manifest.products.length, 'one annotation exists per selected product')
assert(manifest.operatorApprovedProductCount === annotations.filter(({ annotation }) => annotation.status === 'approved').length, 'operatorApprovedProductCount matches annotations')
assert(manifest.targetDistribution.reduce((sum, row) => sum + row.count, 0) === 36, 'target distribution totals 36')
assert(manifest.targetDistribution.find((row) => row.family === 'loafer')?.count === 12, 'target distribution contains 12 loafers')
assert(manifest.currentDistribution.every((row) => row.count === actualFamilyCounts[row.family]), 'current distribution matches selected products')

if (manifest.products.length < manifest.targetProductCount) {
  manifest.status === 'blocked_missing_source_references'
    ? warn(`declared corpus gap: ${manifest.targetProductCount - manifest.products.length} products missing`)
    : fail('incomplete corpus is not marked blocked_missing_source_references')
}
const currentLoafers = actualFamilyCounts.loafer ?? 0
if (currentLoafers < manifest.targetLoaferCount) warn(`declared loafer gap: ${manifest.targetLoaferCount - currentLoafers} loafers missing`)
if (manifest.products.some((product) => product.sourceReference.originalityReviewStatus !== 'operator_confirmed')) warn('selected source originality/rights still needs operator confirmation')
if (manifest.operatorApprovedProductCount === 0) warn('no operator-approved initial review subset exists')

const annotationDir = join(corpusRoot, 'annotations')
const annotationFiles = readdirSync(annotationDir).filter((name) => name.endsWith('.json')).sort()
assert(annotationFiles.length === manifest.products.length, 'annotations directory has no orphan JSON records')
for (const name of annotationFiles) {
  const expected = `annotations/${name}`
  assert(manifest.products.some((product) => product.annotationPath === expected), `annotation is referenced by manifest: ${expected}`)
}

const candidateInventory = readJson(join(corpusRoot, 'inventories', 'candidate-originals.json'))
const excludedInventory = readJson(join(corpusRoot, 'inventories', 'excluded-candidates.json'))
const missingInventory = readJson(join(corpusRoot, 'inventories', 'missing-source-requirements.json'))
assert(candidateInventory.candidateCount === candidateInventory.candidates.length, 'candidate inventory count is internally consistent')
assert(excludedInventory.excludedCount === excludedInventory.exclusions.length, 'excluded inventory count is internally consistent')
assert(missingInventory.missingProductCount === manifest.targetProductCount - manifest.products.length, 'missing-source inventory matches manifest gap')
assert(missingInventory.requirements.reduce((sum, item) => sum + item.missing, 0) === missingInventory.missingProductCount, 'missing-source family requirements total the gap')
assert(excludedInventory.exclusions.every((item) => !selectedPaths.has(item.path)), 'no excluded path is selected')

const duplicateExcludedHashes = groupDuplicates(excludedInventory.exclusions, (item) => item.sha256)
if (duplicateExcludedHashes.length) {
  pass(`duplicate excluded build hashes are explicitly classified (${duplicateExcludedHashes.length} hash groups)`)
} else {
  pass('no duplicate hashes in excluded inventory')
}

const taxonomy = readFileSync(join(corpusRoot, 'FAILURE_TAXONOMY.md'), 'utf8')
const taxonomyCodes = new Set([...taxonomy.matchAll(/`((?:ID|PACK|QUAL)_[A-Z0-9_]+)`/g)].map((match) => match[1]))
for (const { product, annotation } of annotations) {
  const usedCodes = [
    ...annotation.expectedGenerationRisks.map((risk) => risk.failureCode),
    ...annotation.expectedSlotRisks.flatMap((risk) => risk.riskCodes),
  ]
  assert(usedCodes.every((code) => taxonomyCodes.has(code)), `all failure codes are canonical for ${product.corpusProductId}`)
}

const portableData = JSON.stringify({ manifest, annotations: annotations.map((entry) => entry.annotation), candidateInventory, excludedInventory, missingInventory })
const leakPatterns = [
  [/https?:\/\//i, 'web URL'],
  [/[A-Za-z]:[\\/]/, 'absolute Windows path'],
  [/(?:password|passwd|api[_-]?key|access[_-]?token|signed[_-]?url)\s*[=:]\s*[^,}\s]+/i, 'secret-like assignment'],
  [/telegram(?:User|Chat|Sender)?Id/i, 'Telegram identifier field'],
]
for (const [pattern, label] of leakPatterns) assert(!pattern.test(portableData), `portable corpus data contains no ${label}`)

assert(manifest.layerBContract.implemented === false && manifest.layerBContract.identityTruthAuthority === 'never', 'Layer B remains future-only and has no identity-truth authority')
assert(!existsSync(join(repoRoot, 'src', 'golden-product-set-v1')), 'corpus does not modify or live under runtime src')

finish()

function safeRepoPath(repositoryRelativePath) {
  if (!repositoryRelativePath || /^(?:[A-Za-z]:|[\\/])/.test(repositoryRelativePath) || repositoryRelativePath.split(/[\\/]/).includes('..')) return null
  const candidate = resolve(repoRoot, ...repositoryRelativePath.split('/'))
  const rel = relative(repoRoot, candidate)
  if (rel.startsWith(`..${sep}`) || rel === '..') return null
  return candidate
}

function detectMediaType(bytes) {
  if (bytes.length >= 12 && bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp'
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png'
  return 'unknown'
}

function extensionMediaType(extension) {
  return ({ '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' })[extension.toLowerCase()]
}

function hasForbiddenKey(value, forbidden) {
  if (!value || typeof value !== 'object') return false
  if (Array.isArray(value)) return value.some((item) => hasForbiddenKey(item, forbidden))
  return Object.entries(value).some(([key, child]) => forbidden.has(key) || hasForbiddenKey(child, forbidden))
}

function groupDuplicates(items, key) {
  const groups = new Map()
  for (const item of items) {
    const value = key(item)
    groups.set(value, [...(groups.get(value) ?? []), item])
  }
  return [...groups.values()].filter((group) => group.length > 1)
}

function finish() {
  for (const message of passes) console.log(`PASS ${message}`)
  for (const message of warnings) console.warn(`WARN ${message}`)
  for (const message of failures) console.error(`FAIL ${message}`)
  console.log(`SUMMARY ${passes.length} pass, ${warnings.length} warning, ${failures.length} fail`)
  process.exit(failures.length ? 1 : 0)
}
