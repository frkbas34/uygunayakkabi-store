/**
 * Generated Media retention census. This process is deliberately incapable of
 * writing: it uses pg directly, verifies a READ ONLY transaction, runs fixed
 * SELECT statements, and always rolls the transaction back.
 *
 * Usage:
 *   PAYLOAD_DB_PUSH=false npm run dryrun:generated-media-retention -- --confirm-read-only
 */
import { Client, type QueryResultRow } from 'pg'
import { pathToFileURL } from 'node:url'

import {
  classifyGeneratedMediaRetention,
  GENERATED_MEDIA_RETENTION_POLICY_VERSION,
  GENERATED_MEDIA_RETENTION_PROFILES,
  type GeneratedMediaRetentionDecision,
  type GeneratedMediaRetentionEvidence,
} from '../src/lib/generatedMediaRetentionPolicy'

const REQUIRED_CONFIRMATION = '--confirm-read-only'
const MUTATION_LIKE_ARGUMENT = /(?:apply|delete|detach|quarantine|restore|mutate|write|cleanup-now)/i
const KNOWN_SMOKE_JOB_ID = '428'
const KNOWN_FAILURE_JOB_ID = '425'
const KNOWN_INPUT_REJECTION_JOB_ID = '426'
const KNOWN_FAILURE_PRODUCT_ID = '406'

type MediaRow = QueryResultRow & {
  media_id: number
  created_at: Date | string
  updated_at: Date | string
  filesize: string | number | null
  filename: string | null
  media_url: string | null
  product_id: number | null
  contract_version: string | null
  lineage_job_id: string | null
  attempt_id: string | null
  slot_id: string | null
  related_job_id: number | null
  job_status: string | null
  generation_attempts: unknown
  gallery_attached: boolean
  original_attached: boolean
  product_status: string | null
  workflow_status: string | null
  workflow_publish_status: string | null
  image_qc_status: string | null
  shopier_product_id: string | null
  dispatched_channels: string | null
  merchandising_published_at: Date | string | null
}

type JobRow = QueryResultRow & {
  job_id: number
  product_id: number | null
  status: string
  created_at: Date | string
  updated_at: Date | string
  image_count: string | number | null
  active_attempt_id: string | null
  generation_contract_version: string | null
  generation_attempts: unknown
  related_media_count: string | number
  lineage_media_count: string | number
}

export interface GeneratedMediaRetentionDatabaseFacts {
  productImagesRelationship: boolean
  productGenerativeGalleryRelationship: boolean
  publicProductUsage: boolean
  externalPublishingUsage: boolean
  shopierUsage: boolean
  imageQcOrBusinessAssetHold: boolean
  jobStatus: string | null
  orderDependency: 'unknown'
  durableBusinessDependency: boolean
  campaignOrAdUsage: 'unknown'
  stalePreviewAwaitingDecision: 'unknown'
  operatorHold: 'unknown'
  legalHold: 'unknown'
  auditHold: 'unknown'
  lineageConsistent: boolean | 'unknown'
  blobObjectState: 'ambiguous'
}

export interface GeneratedMediaRetentionPrivateDetail {
  mediaId: number
  productId: number | null
  jobId: number | null
  attemptId: string | null
  slotId: string | null
  createdAt: string
  bytes: number
  retentionEvidence: GeneratedMediaRetentionEvidence
  databaseFacts: GeneratedMediaRetentionDatabaseFacts
  decision: GeneratedMediaRetentionDecision
}

export interface GeneratedMediaRetentionDryRunReport {
  policyVersion: string
  runtimeCommit: string
  profile: string
  censusTimestamp: string
  schemaState: {
    transactionReadOnly: true
    lineageColumnsPresent: boolean
    lifecycleColumnsPresent: false
    quarantineColumnsPresent: false
  }
  totals: {
    generatedMedia: number
    imageJobs: number
    jobsWithNoMedia: number
    jobsRepresentedByGeneratedMedia: number
    bytes: number
    quarantineProposalCandidates: number
    physicalCleanupCandidates: number
    physicalDeleteAuthorizations: 0
    manualReview: number
    missingLineage: number
    approvedOrPublicIneligible: number
    smokeOrFailureEvidence: number
    pendingPreview: number
  }
  byLifecycle: Record<string, number>
  byRetentionClass: Record<string, number>
  byHold: Record<string, number>
  byReason: Record<string, number>
  bytesByRetentionClass: Record<string, number>
  ageBands: Record<string, number>
  knownCohorts: {
    job428: string
    job425: string
    job426: string
    product406: string
    previewJobs: number
    previewMedia: number
  }
  noMutationStatement: string
}

const MEDIA_CENSUS_SQL = `
SELECT
  m.id AS media_id,
  m.created_at,
  m.updated_at,
  m.filesize,
  m.filename,
  m.url AS media_url,
  m.product_id,
  m.generation_lineage_contract_version AS contract_version,
  m.generation_lineage_job_id AS lineage_job_id,
  m.generation_lineage_attempt_id AS attempt_id,
  m.generation_lineage_slot_id AS slot_id,
  COALESCE(
    CASE WHEN m.generation_lineage_job_id ~ '^[0-9]+$' THEN m.generation_lineage_job_id::integer END,
    rel_job.parent_id
  ) AS related_job_id,
  j.status::text AS job_status,
  j.generation_attempts,
  EXISTS (
    SELECT 1 FROM products_generative_gallery g WHERE g.image_id = m.id
  ) AS gallery_attached,
  EXISTS (
    SELECT 1 FROM products_images i WHERE i.image_id = m.id
  ) AS original_attached,
  p.status::text AS product_status,
  p.workflow_workflow_status::text AS workflow_status,
  p.workflow_publish_status::text AS workflow_publish_status,
  p.image_quality_status::text AS image_qc_status,
  p.source_meta_shopier_product_id AS shopier_product_id,
  p.source_meta_dispatched_channels AS dispatched_channels,
  p.merchandising_published_at
FROM media m
LEFT JOIN LATERAL (
  SELECT r.parent_id
  FROM image_generation_jobs_rels r
  WHERE r.media_id = m.id AND r.path = 'generatedImages'
  ORDER BY r.parent_id DESC
  LIMIT 1
) rel_job ON TRUE
LEFT JOIN image_generation_jobs j ON j.id = COALESCE(
  CASE WHEN m.generation_lineage_job_id ~ '^[0-9]+$' THEN m.generation_lineage_job_id::integer END,
  rel_job.parent_id
)
LEFT JOIN products p ON p.id = m.product_id
WHERE m.type::text = 'generated'
ORDER BY m.id
`

const JOB_CENSUS_SQL = `
SELECT
  j.id AS job_id,
  j.product_id,
  j.status::text AS status,
  j.created_at,
  j.updated_at,
  j.image_count,
  j.active_attempt_id,
  j.generation_contract_version,
  j.generation_attempts,
  (SELECT count(*) FROM image_generation_jobs_rels r WHERE r.parent_id = j.id AND r.path = 'generatedImages') AS related_media_count,
  (SELECT count(*) FROM media m WHERE m.generation_lineage_job_id = j.id::text) AS lineage_media_count
FROM image_generation_jobs j
ORDER BY j.id
`

function iso(value: Date | string | null | undefined): string | null {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null
}

function numberValue(value: string | number | null | undefined): number {
  const parsed = Number(value || 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function increment(target: Record<string, number>, key: string, amount = 1): void {
  target[key] = (target[key] || 0) + amount
}

function terminalAttemptState(raw: unknown, attemptId: string | null): GeneratedMediaRetentionEvidence['attemptStatus'] {
  if (!Array.isArray(raw)) return 'unknown'
  const match = raw.find((attempt) => attempt && typeof attempt === 'object' && String((attempt as Record<string, unknown>).attemptId || '') === String(attemptId || ''))
  const state = match && typeof match === 'object' ? String((match as Record<string, unknown>).status || '') : ''
  return ['running', 'completed', 'partial', 'failed'].includes(state)
    ? state as GeneratedMediaRetentionEvidence['attemptStatus']
    : 'unknown'
}

function normalizeEvidence(row: MediaRow, now: string): GeneratedMediaRetentionEvidence {
  const relatedJobId = row.related_job_id === null ? null : String(row.related_job_id)
  const jobStatus = row.job_status || 'unknown'
  const galleryOrBusiness = row.gallery_attached
  const published = row.product_status === 'active'
    || row.workflow_publish_status === 'published'
    || Boolean(row.merchandising_published_at)
    || Boolean(row.dispatched_channels && row.dispatched_channels !== '[]')
  const shopier = Boolean(row.shopier_product_id)
  const decision: GeneratedMediaRetentionEvidence['decision'] = galleryOrBusiness || jobStatus === 'approved'
    ? 'approved'
    : jobStatus === 'rejected'
      ? 'rejected'
      : jobStatus === 'preview' || jobStatus === 'review'
        ? 'pending'
        : 'none'
  const createdAt = iso(row.created_at) || now
  const updatedAt = iso(row.updated_at) || createdAt
  const isKnownSmoke = relatedJobId === KNOWN_SMOKE_JOB_ID
  const isKnownFailure = relatedJobId === KNOWN_FAILURE_JOB_ID || String(row.product_id || '') === KNOWN_FAILURE_PRODUCT_ID

  return {
    now,
    mediaKind: 'generated',
    createdAt,
    updatedAt,
    decisionAt: decision === 'rejected' ? updatedAt : null,
    lineage: {
      contractVersion: row.contract_version,
      jobId: row.lineage_job_id,
      attemptId: row.attempt_id,
      slotId: row.slot_id,
      legacy: !row.contract_version || !row.lineage_job_id || !row.attempt_id || !row.slot_id,
    },
    jobRecordExists: relatedJobId ? Boolean(row.job_status) : false,
    jobStatus: ['queued', 'generating', 'preview', 'review', 'approved', 'rejected', 'failed'].includes(jobStatus)
      ? jobStatus as GeneratedMediaRetentionEvidence['jobStatus']
      : 'unknown',
    attemptStatus: terminalAttemptState(row.generation_attempts, row.attempt_id),
    decision,
    galleryAttached: row.gallery_attached,
    originalImagesAttached: row.original_attached,
    publicOrPublished: published,
    shopierOrExternalUse: shopier || Boolean(row.dispatched_channels && row.dispatched_channels !== '[]'),
    orderOrCampaignUse: false,
    imageQcDependency: row.gallery_attached && Boolean(row.image_qc_status),
    activeJob: jobStatus === 'queued' || jobStatus === 'generating',
    smokeEvidence: isKnownSmoke,
    failureEvidence: isKnownFailure,
    regressionFixture: false,
    legalOrAuditHold: false,
    operatorHold: false,
    orphanSuspected: !row.product_id && !relatedJobId,
    // V1 performs no binary request. Complete file metadata is treated as a
    // record-level existence signal, never as proof authorizing deletion.
    blobState: row.filename && row.media_url && numberValue(row.filesize) > 0 ? 'present' : 'unknown',
  }
}

function ageBand(createdAt: string, now: string): string {
  const ageDays = Math.max(0, (Date.parse(now) - Date.parse(createdAt)) / 86_400_000)
  if (ageDays < 7) return '0-6d'
  if (ageDays < 30) return '7-29d'
  if (ageDays < 90) return '30-89d'
  if (ageDays < 180) return '90-179d'
  return '180d+'
}

export function buildGeneratedMediaRetentionReport(
  mediaRows: MediaRow[],
  jobRows: JobRow[],
  now: string,
): { report: GeneratedMediaRetentionDryRunReport; privateDetails: GeneratedMediaRetentionPrivateDetail[] } {
  const privateDetails = mediaRows.map((row) => {
    const evidence = normalizeEvidence(row, now)
    const externalPublishingUsage = row.workflow_publish_status === 'published'
      || Boolean(row.merchandising_published_at)
      || Boolean(row.dispatched_channels && row.dispatched_channels !== '[]')
    const explicitJobId = row.lineage_job_id ? String(row.lineage_job_id) : null
    const relatedJobId = row.related_job_id === null ? null : String(row.related_job_id)
    return {
      mediaId: row.media_id,
      productId: row.product_id,
      jobId: row.related_job_id,
      attemptId: row.attempt_id,
      slotId: row.slot_id,
      createdAt: evidence.createdAt,
      bytes: numberValue(row.filesize),
      retentionEvidence: evidence,
      databaseFacts: {
        productImagesRelationship: row.original_attached,
        productGenerativeGalleryRelationship: row.gallery_attached,
        publicProductUsage: row.product_status === 'active',
        externalPublishingUsage,
        shopierUsage: Boolean(row.shopier_product_id),
        imageQcOrBusinessAssetHold: row.gallery_attached && Boolean(row.image_qc_status),
        jobStatus: row.job_status,
        orderDependency: 'unknown',
        durableBusinessDependency: row.original_attached || row.gallery_attached || row.product_status === 'active' || externalPublishingUsage || Boolean(row.shopier_product_id),
        campaignOrAdUsage: 'unknown',
        stalePreviewAwaitingDecision: 'unknown',
        operatorHold: 'unknown',
        legalHold: 'unknown',
        auditHold: 'unknown',
        lineageConsistent: explicitJobId && relatedJobId ? explicitJobId === relatedJobId : 'unknown',
        // Metadata proves only that a record points at a plausible object. The
        // proposal layer requires independent object verification.
        blobObjectState: 'ambiguous',
      },
      decision: classifyGeneratedMediaRetention(evidence, GENERATED_MEDIA_RETENTION_PROFILES.balanced),
    }
  })

  const byLifecycle: Record<string, number> = {}
  const byRetentionClass: Record<string, number> = {}
  const byHold: Record<string, number> = {}
  const byReason: Record<string, number> = {}
  const bytesByRetentionClass: Record<string, number> = {}
  const ageBands: Record<string, number> = {}
  for (const detail of privateDetails) {
    increment(byLifecycle, detail.decision.lifecycle)
    increment(byRetentionClass, detail.decision.retentionClass)
    increment(bytesByRetentionClass, detail.decision.retentionClass, detail.bytes)
    increment(ageBands, ageBand(detail.createdAt, now))
    for (const hold of detail.decision.holds) increment(byHold, hold)
    for (const reason of detail.decision.reasonCodes) increment(byReason, reason)
  }

  const jobsWithNoMedia = jobRows.filter((row) => numberValue(row.related_media_count) === 0 && numberValue(row.lineage_media_count) === 0)
  const previewJobs = jobRows.filter((row) => row.status === 'preview' || row.status === 'review')
  const previewJobIds = new Set(previewJobs.map((row) => row.job_id))
  const knownJob = (id: string) => jobRows.find((row) => String(row.job_id) === id)
  const statusSummary = (id: string) => {
    const job = knownJob(id)
    if (!job) return 'not_present'
    return `${job.status};media=${numberValue(job.lineage_media_count) || numberValue(job.related_media_count)}`
  }

  const report: GeneratedMediaRetentionDryRunReport = {
    policyVersion: GENERATED_MEDIA_RETENTION_POLICY_VERSION,
    runtimeCommit: process.env.VERCEL_GIT_COMMIT_SHA || 'not_available_in_direct_db_session',
    profile: 'balanced-proposed-not-enforced',
    censusTimestamp: now,
    schemaState: {
      transactionReadOnly: true,
      lineageColumnsPresent: true,
      lifecycleColumnsPresent: false,
      quarantineColumnsPresent: false,
    },
    totals: {
      generatedMedia: mediaRows.length,
      imageJobs: jobRows.length,
      jobsWithNoMedia: jobsWithNoMedia.length,
      jobsRepresentedByGeneratedMedia: new Set(privateDetails.map((row) => row.jobId).filter(Boolean)).size,
      bytes: privateDetails.reduce((sum, row) => sum + row.bytes, 0),
      quarantineProposalCandidates: privateDetails.filter((row) => row.decision.quarantineEligibility === 'proposal_candidate').length,
      physicalCleanupCandidates: privateDetails.filter((row) => row.decision.physicalCleanupEligibility === 'candidate_after_quarantine').length,
      physicalDeleteAuthorizations: 0,
      manualReview: privateDetails.filter((row) => row.decision.manualReviewRequired).length,
      missingLineage: mediaRows.filter((row) => !row.lineage_job_id || !row.attempt_id || !row.slot_id).length,
      approvedOrPublicIneligible: privateDetails.filter((row) => row.decision.retentionClass === 'PERMANENT_BUSINESS_ASSET').length,
      smokeOrFailureEvidence: privateDetails.filter((row) => row.decision.retentionClass === 'SMOKE_EVIDENCE' || row.decision.retentionClass === 'FAILURE_EVIDENCE').length,
      pendingPreview: privateDetails.filter((row) => row.decision.retentionClass === 'PENDING_OPERATOR_DECISION').length,
    },
    byLifecycle,
    byRetentionClass,
    byHold,
    byReason,
    bytesByRetentionClass,
    ageBands,
    knownCohorts: {
      job428: statusSummary(KNOWN_SMOKE_JOB_ID),
      job425: statusSummary(KNOWN_FAILURE_JOB_ID),
      job426: statusSummary(KNOWN_INPUT_REJECTION_JOB_ID),
      product406: privateDetails.some((row) => String(row.productId || '') === KNOWN_FAILURE_PRODUCT_ID) ? 'failure_evidence_present' : 'not_present',
      previewJobs: previewJobs.length,
      previewMedia: privateDetails.filter((row) => row.jobId !== null && previewJobIds.has(row.jobId)).length,
    },
    noMutationStatement: 'READ-ONLY CENSUS ONLY. NO MEDIA, BLOB, JOB, PRODUCT, GALLERY, SCHEMA, PROVIDER, OR TELEGRAM MUTATION OCCURRED.',
  }
  return { report, privateDetails }
}

export async function runGeneratedMediaRetentionDryRun(
  args = process.argv.slice(2),
  connectionString = process.env.DATABASE_URI,
): Promise<GeneratedMediaRetentionDryRunReport> {
  const { report, privateDetails } = await runGeneratedMediaRetentionReadOnlySnapshot(args, connectionString)
  if (args.includes('--private-details')) {
    console.error(JSON.stringify({ policyVersion: report.policyVersion, privateDetails }, null, 2))
  }
  console.log(JSON.stringify(report, null, 2))
  return report
}

export async function runGeneratedMediaRetentionReadOnlySnapshot(
  args = process.argv.slice(2),
  connectionString = process.env.DATABASE_URI,
): Promise<{ report: GeneratedMediaRetentionDryRunReport; privateDetails: GeneratedMediaRetentionPrivateDetail[] }> {
  if (!args.includes(REQUIRED_CONFIRMATION)) {
    throw new Error(`Refusing production census without ${REQUIRED_CONFIRMATION}.`)
  }
  const unexpected = args.filter((arg) => arg !== REQUIRED_CONFIRMATION && arg !== '--private-details')
  if (unexpected.length > 0 || args.some((arg) => MUTATION_LIKE_ARGUMENT.test(arg))) {
    throw new Error(`Refusing unsupported or mutation-like arguments: ${unexpected.join(', ') || 'mutation-like input'}.`)
  }
  if (process.env.PAYLOAD_DB_PUSH !== 'false') {
    throw new Error('Refusing census unless PAYLOAD_DB_PUSH=false exactly.')
  }
  if (!connectionString) throw new Error('DATABASE_URI is required for the direct read-only census.')

  const client = new Client({
    connectionString,
    options: '-c default_transaction_read_only=on -c statement_timeout=30000 -c lock_timeout=2000',
  })
  await client.connect()
  try {
    await client.query('BEGIN TRANSACTION READ ONLY')
    const readOnly = await client.query<{ transaction_read_only: string }>('SHOW transaction_read_only')
    if (readOnly.rows[0]?.transaction_read_only !== 'on') throw new Error('Database transaction is not read-only.')
    const schema = await client.query<{ count: string }>(`
      SELECT count(*)::text AS count
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'media'
        AND column_name IN (
          'generation_lineage_contract_version',
          'generation_lineage_job_id',
          'generation_lineage_attempt_id',
          'generation_lineage_slot_id'
        )
    `)
    if (schema.rows[0]?.count !== '4') throw new Error('Required generated Media lineage schema is incomplete.')
    const [media, jobs] = await Promise.all([
      client.query<MediaRow>(MEDIA_CENSUS_SQL),
      client.query<JobRow>(JOB_CENSUS_SQL),
    ])
    const now = new Date().toISOString()
    return buildGeneratedMediaRetentionReport(media.rows, jobs.rows, now)
  } finally {
    try {
      await client.query('ROLLBACK')
    } finally {
      await client.end()
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runGeneratedMediaRetentionDryRun().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
