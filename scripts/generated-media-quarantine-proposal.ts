/**
 * Generated Media recoverable-quarantine proposal reporter.
 *
 * This wrapper reuses the fixed SELECT-only retention census and produces an
 * aggregate proposal-safety report. It deliberately does not materialize an
 * immutable production manifest because the current Media schema has no
 * authoritative content SHA-256 or quarantine schema. Exact manifests are
 * built only from explicit, fully fingerprinted evidence through the pure
 * generatedMediaQuarantine contract.
 *
 * Usage:
 *   PAYLOAD_DB_PUSH=false npm run dryrun:generated-media-quarantine-proposal -- --confirm-read-only
 */
import { pathToFileURL } from 'node:url'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import {
  runGeneratedMediaRetentionReadOnlySnapshot,
  type GeneratedMediaRetentionDryRunReport,
  type GeneratedMediaRetentionPrivateDetail,
} from './generated-media-retention-dry-run'
import {
  buildGeneratedMediaContradictionGateEvidence,
  evaluateGeneratedMediaQuarantineContradictions,
  GENERATED_MEDIA_QUARANTINE_CONTRACT_VERSION,
  GENERATED_MEDIA_QUARANTINE_MANIFEST_VERSION,
  GENERATED_MEDIA_RELATIONSHIP_FINGERPRINT_VERSION,
  GENERATED_MEDIA_QUARANTINE_SCHEMA_CONTRACT_VERSION,
  type GeneratedMediaQuarantineEvidence,
} from '../src/lib/generatedMediaQuarantine'

const REQUIRED_CONFIRMATION = '--confirm-read-only'
const MUTATION_LIKE_ARGUMENT = /(?:apply|authorize|delete|detach|quarantine-now|restore|mutate|write|backfill|cleanup|cron)/i

function loadEnvFiles(cwd: string): void {
  for (const fileName of ['.env.local', '.env']) {
    const filePath = resolve(cwd, fileName)
    if (!existsSync(filePath)) continue
    for (const rawLine of readFileSync(filePath, 'utf8').split(/\r?\n/)) {
      const line = rawLine.trim()
      if (!line || line.startsWith('#')) continue
      const separator = line.indexOf('=')
      if (separator <= 0) continue
      const key = line.slice(0, separator).trim()
      if (!/^[A-Z_][A-Z0-9_]*$/.test(key) || process.env[key] !== undefined) continue
      let value = line.slice(separator + 1).trim()
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      process.env[key] = value
    }
  }
}

export interface GeneratedMediaQuarantineProposalReport {
  contractVersion: typeof GENERATED_MEDIA_QUARANTINE_CONTRACT_VERSION
  manifestVersion: typeof GENERATED_MEDIA_QUARANTINE_MANIFEST_VERSION
  schemaContractVersion: typeof GENERATED_MEDIA_QUARANTINE_SCHEMA_CONTRACT_VERSION
  relationshipFingerprintVersion: typeof GENERATED_MEDIA_RELATIONSHIP_FINGERPRINT_VERSION
  censusTimestamp: string
  runtimeCommit: string
  refreshedTotals: GeneratedMediaRetentionDryRunReport['totals']
  proposalState: {
    retentionProposalCandidates: number
    physicalCleanupCandidates: number
    physicalDeleteAuthorizations: 0
    exactManifestsCreated: 0
    productionBatchesCreated: 0
    productionSchemaApplied: false
    legacyRecordsRemainManualReview: boolean
    exactContentFingerprintAvailableInCurrentSchema: false
    rawInputsMapped: number
    contradictionGateProposalEligible: number
    contradictionGateIneligible: number
    contradictionGateManualReview: number
    contradictionGateEvidenceChanged: number
  }
  quarantineProposal: true
  quarantineAuthorization: false
  restoreAuthorization: false
  physicalDeleteAuthorization: false
  mutationPermission: false
  classification:
    | 'GENERATED_MEDIA_QUARANTINE_PROPOSAL_PASS_ZERO_CANDIDATES'
    | 'GENERATED_MEDIA_QUARANTINE_PROPOSAL_REVIEW_CANDIDATES_NOT_AUTHORIZED'
  safeNextAction: string
  noMutationStatement: string
}

export function mapGeneratedMediaRetentionDetailToQuarantineEvidence(
  detail: GeneratedMediaRetentionPrivateDetail,
  evidenceCapturedAt: string,
): GeneratedMediaQuarantineEvidence {
  const facts = detail.databaseFacts
  const retention = detail.retentionEvidence
  const jobId = detail.jobId === null ? null : String(detail.jobId)
  const explicitLineage = {
    contractVersion: retention.lineage.contractVersion ?? null,
    jobId: retention.lineage.jobId ?? null,
    attemptId: retention.lineage.attemptId ?? null,
    slotId: retention.lineage.slotId ?? null,
  }
  return {
    mediaId: String(detail.mediaId),
    mediaKind: 'generated',
    recordVersion: retention.updatedAt,
    contentSha256: null,
    storageLocatorDigest: null,
    byteSize: detail.bytes || null,
    mimeType: null,
    width: null,
    height: null,
    explicitLineage,
    observedJobRelationshipIds: jobId ? [jobId] : [],
    relationships: {
      productId: detail.productId === null ? null : String(detail.productId),
      jobIds: jobId ? [jobId] : [],
      galleryPositions: [],
      originalImagePositions: [],
      publishedChannels: [],
      shopierProductIds: [],
      orderIds: [],
      campaignIds: [],
      activeJobIds: retention.activeJob && jobId ? [jobId] : [],
      pendingDecisionJobIds: (retention.decision === 'pending' || retention.jobStatus === 'preview' || retention.jobStatus === 'review') && jobId ? [jobId] : [],
      lastRelationshipChangeAt: retention.relationshipChangedAt ?? null,
    },
    rawEvidence: {
      evidenceCapturedAt,
      latestRelationshipActivityAt: retention.relationshipChangedAt ?? null,
      originalMedia: false,
      productImagesRelationship: facts.productImagesRelationship,
      productGenerativeGalleryRelationship: facts.productGenerativeGalleryRelationship,
      approvedUsage: retention.decision === 'approved' || retention.jobStatus === 'approved',
      publicProductUsage: facts.publicProductUsage,
      externalPublishingUsage: facts.externalPublishingUsage,
      shopierUsage: facts.shopierUsage,
      orderDependency: facts.orderDependency,
      durableBusinessDependency: facts.durableBusinessDependency,
      campaignOrAdUsage: facts.campaignOrAdUsage,
      imageQcOrBusinessAssetHold: facts.imageQcOrBusinessAssetHold,
      activeJob: retention.activeJob,
      queuedJob: retention.jobStatus === 'queued',
      generatingJob: retention.jobStatus === 'generating',
      pendingPreview: retention.jobStatus === 'preview' || retention.decision === 'pending',
      stalePreviewAwaitingDecision: facts.stalePreviewAwaitingDecision,
      pendingReviewOrApproval: retention.jobStatus === 'review',
      smokeEvidenceHold: retention.smokeEvidence,
      failureEvidenceHold: retention.failureEvidence || retention.regressionFixture,
      operatorHold: facts.operatorHold,
      legalHold: facts.legalHold,
      auditHold: facts.auditHold,
      jobLineagePresent: Boolean(explicitLineage.jobId),
      attemptLineagePresent: Boolean(explicitLineage.attemptId),
      slotLineagePresent: Boolean(explicitLineage.slotId),
      lineageConsistent: facts.lineageConsistent,
      blobObjectState: facts.blobObjectState,
    },
    retentionEvidence: retention,
    evidenceReferenceIds: ['generated-media-retention-read-only-snapshot'],
  }
}

export function buildGeneratedMediaQuarantineProposalReport(
  retention: GeneratedMediaRetentionDryRunReport,
  evidence: GeneratedMediaQuarantineEvidence[] = [],
): GeneratedMediaQuarantineProposalReport {
  const proposalCandidates = retention.totals.quarantineProposalCandidates
  const zeroCandidates = proposalCandidates === 0
    && retention.totals.physicalCleanupCandidates === 0
    && retention.totals.physicalDeleteAuthorizations === 0
  const contradictionOutcomes = evidence.map((item) => evaluateGeneratedMediaQuarantineContradictions(
    buildGeneratedMediaContradictionGateEvidence(item),
  ).outcome)
  return {
    contractVersion: GENERATED_MEDIA_QUARANTINE_CONTRACT_VERSION,
    manifestVersion: GENERATED_MEDIA_QUARANTINE_MANIFEST_VERSION,
    schemaContractVersion: GENERATED_MEDIA_QUARANTINE_SCHEMA_CONTRACT_VERSION,
    relationshipFingerprintVersion: GENERATED_MEDIA_RELATIONSHIP_FINGERPRINT_VERSION,
    censusTimestamp: retention.censusTimestamp,
    runtimeCommit: retention.runtimeCommit,
    refreshedTotals: { ...retention.totals },
    proposalState: {
      retentionProposalCandidates: proposalCandidates,
      physicalCleanupCandidates: retention.totals.physicalCleanupCandidates,
      physicalDeleteAuthorizations: 0,
      exactManifestsCreated: 0,
      productionBatchesCreated: 0,
      productionSchemaApplied: false,
      legacyRecordsRemainManualReview: retention.totals.missingLineage > 0 || retention.totals.manualReview > 0,
      exactContentFingerprintAvailableInCurrentSchema: false,
      rawInputsMapped: evidence.length,
      contradictionGateProposalEligible: contradictionOutcomes.filter((outcome) => outcome === 'proposal_eligible').length,
      contradictionGateIneligible: contradictionOutcomes.filter((outcome) => outcome === 'quarantine_ineligible').length,
      contradictionGateManualReview: contradictionOutcomes.filter((outcome) => outcome === 'manual_review').length,
      contradictionGateEvidenceChanged: contradictionOutcomes.filter((outcome) => outcome === 'evidence_changed_reauthorize').length,
    },
    quarantineProposal: true,
    quarantineAuthorization: false,
    restoreAuthorization: false,
    physicalDeleteAuthorization: false,
    mutationPermission: false,
    classification: zeroCandidates
      ? 'GENERATED_MEDIA_QUARANTINE_PROPOSAL_PASS_ZERO_CANDIDATES'
      : 'GENERATED_MEDIA_QUARANTINE_PROPOSAL_REVIEW_CANDIDATES_NOT_AUTHORIZED',
    safeNextAction: zeroCandidates
      ? 'Preserve every record. No exact quarantine manifest is needed at this boundary.'
      : 'Review each candidate with complete content, relationship, and evidence fingerprints; proposal status grants no authorization.',
    noMutationStatement: 'READ-ONLY PROPOSAL ONLY. NO MEDIA, BLOB, JOB, PRODUCT, GALLERY, BATCH, SCHEMA, PROVIDER, TELEGRAM, QUARANTINE, RESTORE, OR DELETE MUTATION OCCURRED.',
  }
}

export async function runGeneratedMediaQuarantineProposal(
  args = process.argv.slice(2),
): Promise<GeneratedMediaQuarantineProposalReport> {
  if (!args.includes(REQUIRED_CONFIRMATION)) {
    throw new Error(`Refusing production proposal report without ${REQUIRED_CONFIRMATION}.`)
  }
  const unexpected = args.filter((arg) => arg !== REQUIRED_CONFIRMATION)
  if (unexpected.length > 0 || args.some((arg) => MUTATION_LIKE_ARGUMENT.test(arg))) {
    throw new Error(`Refusing unsupported or mutation-like arguments: ${unexpected.join(', ') || 'mutation-like input'}.`)
  }
  loadEnvFiles(process.cwd())
  process.env.PAYLOAD_DB_PUSH = 'false'
  if (process.env.PAYLOAD_DB_PUSH !== 'false') {
    throw new Error('Refusing proposal report unless PAYLOAD_DB_PUSH=false exactly.')
  }
  const snapshot = await runGeneratedMediaRetentionReadOnlySnapshot([REQUIRED_CONFIRMATION])
  const evidence = snapshot.privateDetails.map((detail) => mapGeneratedMediaRetentionDetailToQuarantineEvidence(
    detail,
    snapshot.report.censusTimestamp,
  ))
  const report = buildGeneratedMediaQuarantineProposalReport(snapshot.report, evidence)
  console.log(JSON.stringify(report, null, 2))
  return report
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runGeneratedMediaQuarantineProposal().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
