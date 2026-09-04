import assert from 'node:assert'
import { existsSync, readFileSync } from 'node:fs'

import {
  authenticateControlledFreshCandidateReceipt,
  CONTROLLED_FRESH_CANDIDATE_CONTRACT_IDENTITY,
  CONTROLLED_FRESH_CANDIDATE_MANIFEST_VERSION,
  CONTROLLED_FRESH_CANDIDATE_PRIVATE_VERSION,
  CONTROLLED_FRESH_CANDIDATE_RECEIPT_CONSUMPTION_DOMAIN,
  CONTROLLED_FRESH_CANDIDATE_RECEIPT_DOMAIN,
  CONTROLLED_FRESH_CANDIDATE_RUNTIME_IDENTITY,
  readControlledFreshCandidateCapability,
  sealControlledFreshCandidateReceipt,
  serializeControlledFreshCandidateReceipt,
  type ControlledFreshCandidatePrivateReceipt,
} from '../src/lib/controlledFreshCandidateReceipt'

type PackageJson = {
  scripts?: Record<string, string>
}

type ReadOnlySmoke = {
  name: string
  scriptPath: string
  requiresPayloadPushFalse: boolean
  extraNeedles?: string[]
  additionalSourcePaths?: string[]
  strictCli?: boolean
}

function read(filePath: string): string {
  return readFileSync(filePath, 'utf8')
}

function assertIncludes(haystack: string, needle: string, label: string): void {
  assert.ok(haystack.includes(needle), `${label} must include: ${needle}`)
}

const CONTROLLED_RECEIPT_GOVERNANCE_KEY = new Uint8Array(32).fill(83)
const CONTROLLED_RECEIPT_GOVERNANCE_COMMIT = '921b2b7a98d36e99bb1427979d4561edd7881b11'
const CONTROLLED_RECEIPT_GOVERNANCE_ENVIRONMENT = 'runtime-smoke-governance-offline'

function controlledReceiptGovernanceFixture(): Omit<ControlledFreshCandidatePrivateReceipt, 'seal'> {
  const filename = 'cfc-governance-execution-0001-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.png'
  return {
    version: CONTROLLED_FRESH_CANDIDATE_PRIVATE_VERSION,
    executionAuthorization: {
      identity: 'governance-owner-0001',
      digest: '1'.repeat(64),
      issuedAt: '2030-01-01T00:00:00.000Z',
      notBefore: '2030-01-01T00:00:00.000Z',
      expiresAt: '2030-01-01T00:30:00.000Z',
      consumed: true,
    },
    executionId: 'governance-execution-0001',
    manifest: {
      version: CONTROLLED_FRESH_CANDIDATE_MANIFEST_VERSION,
      identity: 'governance-manifest-0001',
      digest: '2'.repeat(64),
      title: 'Offline governance candidate',
      positivePrice: 1,
      provenanceStatement: 'Synthetic offline governance evidence.',
      stockCandidate: 'SN9001',
      visualFamily: 'generic',
      productFamily: 'shoes',
      productType: 'shoe',
      original: {
        filename,
        contentDigest: '3'.repeat(64),
        mimeType: 'image/png',
        byteSize: 4,
        width: 1,
        height: 1,
      },
    },
    runtime: {
      identity: CONTROLLED_FRESH_CANDIDATE_RUNTIME_IDENTITY,
      contract: CONTROLLED_FRESH_CANDIDATE_CONTRACT_IDENTITY,
      commit: CONTROLLED_RECEIPT_GOVERNANCE_COMMIT,
      environment: CONTROLLED_RECEIPT_GOVERNANCE_ENVIRONMENT,
      receiptDestinationDigest: '4'.repeat(64),
    },
    stockCandidate: 'SN9001',
    expectedStateFingerprint: '5'.repeat(64),
    product: { state: 'retained', id: 77, fingerprint: '6'.repeat(64) },
    media: {
      state: 'retained',
      id: 501,
      productId: 77,
      expectedFilename: filename,
      actualFilename: filename,
    },
    storageLedger: [{ ordinal: 1, filename, state: 'known_present' }],
    transactions: {
      productCreate: { intent: 'dispatched', certainty: 'observed' },
      mediaCreate: { intent: 'dispatched', certainty: 'observed' },
      relationshipUpdate: { intent: 'dispatched', certainty: 'observed' },
      finalization: { intent: 'dispatched', certainty: 'observed' },
    },
    phase: 'teardown_observed',
    budgets: {
      stockCandidates: 1,
      stockLookups: 1,
      productCreates: 1,
      mediaCreates: 1,
      productRelationshipUpdates: 1,
      productFinalizationUpdates: 1,
      explicitMediaUpdates: 0,
      canonicalMediaMetadataUpdates: 1,
      logicalStorageUploads: 1,
      productDeletes: 0,
      mediaDeletes: 0,
      variantMutations: 0,
      storageDeletes: 0,
      automaticMediaDetachUpdates: 0,
      automaticRequarantineUpdates: 0,
      otherRecordMutations: 0,
      operatorRetries: 0,
      replacementExecutions: 0,
    },
    quarantineCertainty: 'pending_observed',
    commitCertainty: 'committed_observed',
    finalization: { requested: true, observed: true },
    mutationResourceTeardown: { attempted: true, completed: true, status: 'complete' },
    authorityClosure: { status: 'pending_not_attested', boundary: 'outside_durable_receipt' },
  }
}

function assertControlledReceiptSemanticGovernance(): void {
  assert.equal(CONTROLLED_FRESH_CANDIDATE_PRIVATE_VERSION, 'controlled-fresh-candidate-private/v3')
  assert.equal(CONTROLLED_FRESH_CANDIDATE_MANIFEST_VERSION, 'controlled-fresh-candidate-manifest/v1')
  assert.equal(CONTROLLED_FRESH_CANDIDATE_RUNTIME_IDENTITY, 'controlled-fresh-candidate-runtime/v3')
  assert.equal(CONTROLLED_FRESH_CANDIDATE_CONTRACT_IDENTITY, 'controlled-fresh-candidate-contract/v3')
  assert.equal(CONTROLLED_FRESH_CANDIDATE_RECEIPT_DOMAIN, 'uygunayakkabi:controlled-fresh-candidate:private-receipt:v3')
  assert.equal(CONTROLLED_FRESH_CANDIDATE_RECEIPT_CONSUMPTION_DOMAIN, 'uygunayakkabi:controlled-fresh-candidate:receipt-consumption:v3')

  const unsigned = controlledReceiptGovernanceFixture()
  const sealed = sealControlledFreshCandidateReceipt(unsigned, CONTROLLED_RECEIPT_GOVERNANCE_KEY)
  const serialized = serializeControlledFreshCandidateReceipt(sealed)
  let consumptionIdentity = ''
  const capability = authenticateControlledFreshCandidateReceipt({
    serialized,
    key: CONTROLLED_RECEIPT_GOVERNANCE_KEY,
    expectedCommitIdentity: CONTROLLED_RECEIPT_GOVERNANCE_COMMIT,
    expectedEnvironmentIdentity: CONTROLLED_RECEIPT_GOVERNANCE_ENVIRONMENT,
    consume(identity) {
      consumptionIdentity = identity
      return true
    },
  })
  assert.match(consumptionIdentity, /^[0-9a-f]{64}$/)
  const authenticated = readControlledFreshCandidateCapability(capability)
  assert.deepEqual(authenticated.mutationResourceTeardown, { attempted: true, completed: true, status: 'complete' })
  assert.deepEqual(authenticated.authorityClosure, {
    status: 'pending_not_attested',
    boundary: 'outside_durable_receipt',
  })
  assert.throws(() => authenticateControlledFreshCandidateReceipt({
    serialized,
    key: CONTROLLED_RECEIPT_GOVERNANCE_KEY,
    expectedCommitIdentity: CONTROLLED_RECEIPT_GOVERNANCE_COMMIT,
    expectedEnvironmentIdentity: CONTROLLED_RECEIPT_GOVERNANCE_ENVIRONMENT,
    consume: () => false,
  }), /CONTROLLED_RECEIPT_REPLAYED/)

  for (const mutationResourceTeardown of [
    { attempted: false, completed: false, status: 'not_started' as const },
    { attempted: true, completed: false, status: 'failed' as const },
    { attempted: true, completed: false, status: 'unknown' as const },
    { attempted: true, completed: false, status: 'complete' as const },
    { attempted: false, completed: true, status: 'complete' as const },
    { attempted: true, completed: true, status: 'failed' as const },
  ]) {
    const incomplete = sealControlledFreshCandidateReceipt({
      ...structuredClone(unsigned),
      mutationResourceTeardown,
    }, CONTROLLED_RECEIPT_GOVERNANCE_KEY)
    const incompleteSerialized = serializeControlledFreshCandidateReceipt(incomplete)
    let incompleteConsumptionCalls = 0
    assert.throws(() => authenticateControlledFreshCandidateReceipt({
      serialized: incompleteSerialized,
      key: CONTROLLED_RECEIPT_GOVERNANCE_KEY,
      expectedCommitIdentity: CONTROLLED_RECEIPT_GOVERNANCE_COMMIT,
      expectedEnvironmentIdentity: CONTROLLED_RECEIPT_GOVERNANCE_ENVIRONMENT,
      consume: () => { incompleteConsumptionCalls += 1; return true },
    }), /CONTROLLED_RECEIPT_TEARDOWN_INCOMPLETE/)
    assert.equal(incompleteConsumptionCalls, 0)

    const tampered = JSON.parse(incompleteSerialized) as ControlledFreshCandidatePrivateReceipt
    tampered.seal = tampered.seal === '0'.repeat(64) ? '1'.repeat(64) : '0'.repeat(64)
    assert.throws(() => authenticateControlledFreshCandidateReceipt({
      serialized: JSON.stringify(tampered),
      key: CONTROLLED_RECEIPT_GOVERNANCE_KEY,
      expectedCommitIdentity: CONTROLLED_RECEIPT_GOVERNANCE_COMMIT,
      expectedEnvironmentIdentity: CONTROLLED_RECEIPT_GOVERNANCE_ENVIRONMENT,
      consume: () => { incompleteConsumptionCalls += 1; return true },
    }), /CONTROLLED_RECEIPT_AUTHENTICATION_FAILED/)
    assert.equal(incompleteConsumptionCalls, 0)
  }

  const rejects = (label: string, transform: (candidate: Record<string, unknown>) => void): void => {
    const candidate = structuredClone(unsigned) as unknown as Record<string, unknown>
    transform(candidate)
    assert.throws(
      () => sealControlledFreshCandidateReceipt(
        candidate as unknown as Omit<ControlledFreshCandidatePrivateReceipt, 'seal'>,
        CONTROLLED_RECEIPT_GOVERNANCE_KEY,
      ),
      /CONTROLLED_RECEIPT_SHAPE_INVALID/,
      label,
    )
  }
  rejects('private v1 receipt', (candidate) => { candidate.version = 'controlled-fresh-candidate-private/v1' })
  rejects('private receipt cannot use manifest v1 as its version', (candidate) => {
    candidate.version = CONTROLLED_FRESH_CANDIDATE_MANIFEST_VERSION
  })
  rejects('missing mutation teardown', (candidate) => { delete candidate.mutationResourceTeardown })
  rejects('uncertain mutation teardown status', (candidate) => {
    candidate.mutationResourceTeardown = { attempted: true, completed: false, status: 'uncertain' }
  })
  rejects('additional mutation teardown property', (candidate) => {
    candidate.mutationResourceTeardown = { attempted: true, completed: true, status: 'complete', additional: true }
  })
  rejects('missing authority status', (candidate) => {
    delete (candidate.authorityClosure as Record<string, unknown>).status
  })
  rejects('completed durable authority closure', (candidate) => {
    ;(candidate.authorityClosure as Record<string, unknown>).status = 'complete'
  })
  rejects('missing durable authority boundary', (candidate) => {
    delete (candidate.authorityClosure as Record<string, unknown>).boundary
  })
  rejects('authority closure claimed inside receipt', (candidate) => {
    ;(candidate.authorityClosure as Record<string, unknown>).boundary = 'inside_durable_receipt'
  })
  rejects('additional authority closure field', (candidate) => {
    ;(candidate.authorityClosure as Record<string, unknown>).attested = true
  })
}

function assertCommandDocumentedNearConfirmation(docText: string, smokeName: string, label: string): void {
  const command = `npm run ${smokeName}`
  const index = docText.indexOf(command)
  assert.ok(index >= 0, `${label} must document ${command}`)

  const nearby = docText.slice(index, index + 280)
  assertIncludes(nearby, '--confirm-read-only', `${label} ${command} example`)
}

function assertNoWriteWording(source: string, label: string): void {
  assert.ok(
    /(no writes|never writes|does not update|does not run ddl|writes, jobs)/i.test(source),
    `${label} must include no-write/no-mutation wording`,
  )
}

const readOnlySmokes: ReadOnlySmoke[] = [
  {
    name: 'smoke:activation:read',
    scriptPath: 'scripts/activation-runtime-smoke.ts',
    requiresPayloadPushFalse: true,
  },
  {
    name: 'smoke:product-flow:read',
    scriptPath: 'scripts/product-flow-runtime-smoke.ts',
    requiresPayloadPushFalse: true,
    extraNeedles: ['primaryOperatorStep', 'checklistSummary', 'dispatchSummary', 'nextAction', 'commandRef', 'Operator checklist', 'BotEvents', 'provenanceEvents'],
  },
  {
    name: 'smoke:image-plan:read',
    scriptPath: 'scripts/image-plan-runtime-smoke.ts',
    requiresPayloadPushFalse: true,
    extraNeedles: ['image-generation job', 'queue image generation', 'provider calls', 'BotEvents', 'provenanceEvents'],
  },
  {
    name: 'smoke:visual-pilot-target:read',
    scriptPath: 'scripts/visual-pilot-target-runtime-smoke.ts',
    requiresPayloadPushFalse: true,
    strictCli: true,
    additionalSourcePaths: [
      'src/lib/visualPilotTargetVerifier.ts',
      'src/lib/visualPilotMediaEvidence.ts',
    ],
    extraNeedles: [
      'TARGET_READY_FOR_PILOT_APPROVAL',
      'TARGET_BLOCKED',
      'TARGET_EVIDENCE_UNSUPPORTED',
      'paginationReconciled',
      'VISUAL_PILOT_MEDIA_MAX_BYTES',
      'ORIGINAL_REDIRECT_LIMIT_EXCEEDED',
      'blockingReasons',
      'JSON.stringify',
      'payload.destroy()',
      'pathToFileURL',
    ],
  },
  {
    name: 'smoke:load-plan:read',
    scriptPath: 'scripts/load-plan-runtime-smoke.ts',
    requiresPayloadPushFalse: true,
    extraNeedles: [
      'spend on ads',
      'activate SupplierScout',
      'retired-channel activation',
      'First product worklist',
      'plan.worklist',
      'worklistCandidates',
      'plan.batchSummary',
      'worklistFocus',
      'nextSafeRead',
      'focusRefs',
      'focusQueue',
      'focusDetails',
      'runtimeFlowCommand',
    ],
  },
  {
    name: 'smoke:brand-safety:read',
    scriptPath: 'scripts/brand-safety-remediation-runtime-smoke.ts',
    requiresPayloadPushFalse: true,
    extraNeedles: [
      'Brand-Safety Remediation Plan',
      'blockedCount',
      'provenance-review audit events',
      'product rewrites',
      'runtimeFlowCommand',
      'externalExposure',
      'nextSafeAction',
    ],
  },
  {
    name: 'smoke:image-qc-plan:read',
    scriptPath: 'scripts/image-qc-remediation-runtime-smoke.ts',
    requiresPayloadPushFalse: true,
    extraNeedles: [
      'Image QC Remediation Queue',
      'queueCount',
      'brandBlockedCount',
      'runtimeImagePlan',
      'Image QC decisions',
    ],
  },
  {
    name: 'smoke:provider-health:read',
    scriptPath: 'scripts/provider-health-runtime-smoke.ts',
    requiresPayloadPushFalse: true,
    extraNeedles: ['missing key names only'],
  },
  {
    name: 'smoke:pi-provider-health:read',
    scriptPath: 'scripts/pi-provider-health-runtime-smoke.ts',
    requiresPayloadPushFalse: false,
    extraNeedles: ['does not connect to Payload', 'External provider calls: none'],
  },
  {
    name: 'smoke:ad-readiness:read',
    scriptPath: 'scripts/ad-readiness-runtime-smoke.ts',
    requiresPayloadPushFalse: true,
    extraNeedles: ['spend on ads'],
  },
  {
    name: 'smoke:ad-performance:read',
    scriptPath: 'scripts/ad-performance-runtime-smoke.ts',
    requiresPayloadPushFalse: true,
    extraNeedles: ['external ad API', 'spend on ads'],
  },
  {
    name: 'smoke:business-funnel:read',
    scriptPath: 'scripts/business-funnel-runtime-smoke.ts',
    requiresPayloadPushFalse: true,
    extraNeedles: ['mutate leads/orders/stock', 'spend on ads'],
  },
  {
    name: 'smoke:lead-followup:read',
    scriptPath: 'scripts/lead-followup-runtime-smoke.ts',
    requiresPayloadPushFalse: true,
    extraNeedles: [
      'mutate leads',
      'message customers',
      'PII-light summary',
      "const { BlogPosts }",
      'Categories, BlogPosts, CustomerInquiries',
    ],
  },
  {
    name: 'smoke:imageqc:schema',
    scriptPath: 'scripts/image-qc-schema-check.ts',
    requiresPayloadPushFalse: false,
    extraNeedles: ['information_schema', 'does not run DDL'],
  },
  {
    name: 'smoke:blog-schema:read',
    scriptPath: 'scripts/blog-featured-image-schema-check.ts',
    requiresPayloadPushFalse: false,
    extraNeedles: ['information_schema', 'featured_image_id', 'does not run DDL'],
  },
  {
    name: 'smoke:wizard-sessions:schema',
    scriptPath: 'scripts/wizard-sessions-schema-check.ts',
    requiresPayloadPushFalse: false,
    extraNeedles: ['information_schema', 'wizard_sessions', 'does not run DDL'],
  },
  {
    name: 'smoke:lead-status-schema:read',
    scriptPath: 'scripts/lead-status-schema-check.ts',
    requiresPayloadPushFalse: false,
    extraNeedles: ['pg_enum', 'enum_customer_inquiries_status', 'does not run DDL'],
  },
  {
    name: 'smoke:lead-conversion-schema:read',
    scriptPath: 'scripts/lead-conversion-schema-check.ts',
    requiresPayloadPushFalse: false,
    extraNeedles: ['information_schema', 'pg_constraint', 'does not run DDL'],
  },
  {
    name: 'smoke:blog-preflight:read',
    scriptPath: 'scripts/blog-preflight-runtime-smoke.ts',
    requiresPayloadPushFalse: true,
    extraNeedles: ['Blog editorial preflight', '--post=', 'article write'],
  },
  {
    name: 'smoke:shopier-order-id-schema:read',
    scriptPath: 'scripts/shopier-order-id-schema-check.ts',
    requiresPayloadPushFalse: false,
    extraNeedles: ['information_schema', 'pg_indexes', 'does not run DDL'],
  },
  {
    name: 'smoke:shopier:read',
    scriptPath: 'scripts/shopier-operator-smoke.ts',
    requiresPayloadPushFalse: true,
    extraNeedles: ['buildShopierDashboardReviewRows', 'reviewRows', 'batch review sample', 'flowCommand', 'runtimeFlowCommand'],
  },
]

const docsToCheck = [
  ['AGENTS.md', 'AGENTS.md'],
  ['CLAUDE.md', 'CLAUDE.md'],
  ['project-control/RUNTIME_SMOKE_CHECKS.md', 'runtime smoke runbook'],
  ['project-control/DEPLOYMENT_OPS_RUNBOOK.md', 'deployment ops runbook'],
  ['chatgpt-project-sources/13_VALIDATION_DEPLOYMENT_OPS.md', 'source-pack validation ops'],
] as const

const packageJson = JSON.parse(read('package.json')) as PackageJson
const scripts = packageJson.scripts ?? {}

assertIncludes(
  scripts['test:runtime-smokes'] ?? '',
  'tsx scripts/runtime-smoke-governance.ts',
  'package test:runtime-smokes script',
)
assertIncludes(scripts['test:safe'] ?? '', 'npm run test:runtime-smokes', 'safe test suite')
assert.ok(!(scripts['test:safe'] ?? '').includes('smoke:'), 'test:safe must not run runtime smoke commands')

for (const smoke of readOnlySmokes) {
  assert.ok(existsSync(smoke.scriptPath), `${smoke.name} script is missing: ${smoke.scriptPath}`)
  assertIncludes(scripts[smoke.name] ?? '', `tsx ${smoke.scriptPath}`, `package ${smoke.name} script`)

  const source = [smoke.scriptPath, ...(smoke.additionalSourcePaths ?? [])].map(read).join('\n')
  assertIncludes(source, '--confirm-read-only', `${smoke.name} confirmation flag`)
  if (smoke.strictCli) {
    assertIncludes(source, 'parseVisualPilotTargetArgs', `${smoke.name} strict CLI parser`)
    assertIncludes(source, 'CLI_UNKNOWN_ARGUMENT', `${smoke.name} unknown-argument refusal`)
    assertIncludes(source, 'CLI_READ_ONLY_CONFIRMATION_REQUIRED', `${smoke.name} literal confirmation refusal`)
  } else {
    assertIncludes(source, 'READ_ONLY', `${smoke.name} READ_ONLY env/confirmation`)
    assertIncludes(source, 'mutationRequested', `${smoke.name} mutation refusal state`)
    assertIncludes(source, 'Refusing to', `${smoke.name} refusal path`)
  }
  assertNoWriteWording(source, smoke.name)

  if (smoke.requiresPayloadPushFalse) {
    assertIncludes(source, "process.env.PAYLOAD_DB_PUSH = 'false'", `${smoke.name} schema-push guard`)
    if (!smoke.strictCli) assertIncludes(source, 'PAYLOAD_DB_PUSH: false', `${smoke.name} schema-push output`)
  }

  for (const needle of smoke.extraNeedles ?? []) {
    assertIncludes(source, needle, `${smoke.name} extra guardrail`)
  }

  for (const [docPath, label] of docsToCheck) {
    assertCommandDocumentedNearConfirmation(read(docPath), smoke.name, label)
  }
}

const visualPilotScript = read('scripts/visual-pilot-target-runtime-smoke.ts')
const visualPilotResources = read('scripts/visual-pilot-target-runtime-resources.ts')
const visualPilotTestScript = scripts['test:visual-pilot-target'] ?? ''
assertIncludes(visualPilotTestScript, 'visualPilotMediaEvidence.test.ts', 'visual pilot Media evidence tests')
assertIncludes(visualPilotTestScript, 'visualPilotTargetVerifier.test.ts', 'visual pilot verifier tests')
assertIncludes(visualPilotTestScript, 'visual-pilot-target-runtime-smoke.test.ts', 'visual pilot CLI tests')
assertIncludes(scripts['test:safe'] ?? '', 'npm run test:visual-pilot-target', 'safe suite visual pilot tests')
assert.ok(!(scripts['test:safe'] ?? '').includes('smoke:visual-pilot-target:read'), 'test:safe must not execute visual pilot runtime smoke')
assertIncludes(visualPilotResources, 'FROM payload_jobs', 'visual pilot durable queue receipt authority')
assertIncludes(visualPilotResources, "input ->> 'jobId' = ANY($1::text[])", 'visual pilot exact queue receipt correlation')
assertIncludes(visualPilotResources, 'ORDER BY id ASC', 'visual pilot deterministic queue receipt pagination')
assertIncludes(visualPilotScript, "collection: 'story-jobs'", 'visual pilot StoryJob read')
assertIncludes(visualPilotScript, "collection: 'bot-events'", 'visual pilot BotEvent read')
assertIncludes(visualPilotScript, "collection: 'media'", 'visual pilot exhaustive product-scoped Media read')
assert.ok(!/payload\.(?:create|update|delete)|payload\.jobs\.(?:queue|run)|sendTelegram|approveImage|rejectImage|generateProductImages/.test(visualPilotScript), 'visual pilot runtime adapter must expose no mutation, queue, Telegram, approval, or generation call')
assert.ok(!/\b(?:INSERT|UPDATE|DELETE|ALTER|DROP|CREATE|TRUNCATE)\b/i.test(visualPilotResources), 'visual pilot runtime resources must remain read-only')

const freshDiscoveryScript = read('scripts/fresh-visual-product-runtime-smoke.ts')
const freshDiscoveryResources = read('scripts/fresh-visual-product-runtime-resources.ts')
const freshDiscoveryContract = read('src/lib/freshVisualProductDiscovery.ts')
const freshDiscoveryTests = scripts['test:fresh-visual-discovery'] ?? ''
assertIncludes(scripts['smoke:visual-lock-fresh-candidates:read'] ?? '', 'fresh-visual-product-runtime-smoke.ts', 'fresh discovery governed command')
assertIncludes(freshDiscoveryTests, 'freshVisualProductDiscovery.test.ts', 'fresh discovery contract tests')
assertIncludes(freshDiscoveryTests, 'fresh-visual-product-runtime-smoke.test.ts', 'fresh discovery CLI tests')
assertIncludes(scripts['test:safe'] ?? '', 'npm run test:fresh-visual-discovery', 'safe suite fresh discovery tests')
assert.ok(!(scripts['test:safe'] ?? '').includes('smoke:visual-lock-fresh-candidates:read'), 'test:safe must not execute configured fresh discovery')
assertIncludes(freshDiscoveryContract, 'parseFreshVisualDiscoveryArgs', 'fresh discovery strict CLI parser')
assertIncludes(freshDiscoveryContract, 'UNKNOWN_ARGUMENT', 'fresh discovery unknown-argument refusal')
assertIncludes(freshDiscoveryContract, 'READ_ONLY_CONFIRMATION_REQUIRED', 'fresh discovery literal confirmation refusal')
assertIncludes(freshDiscoveryScript, "process.env.PAYLOAD_DB_PUSH !== 'false'", 'fresh discovery schema-push fail-closed guard')
assertIncludes(freshDiscoveryResources, 'INNER JOIN image_generation_jobs', 'fresh discovery queue receipt Product correlation')
assertIncludes(freshDiscoveryResources, 'ORDER BY id ASC', 'fresh discovery deterministic durable receipt order')
assertIncludes(freshDiscoveryResources, "{ id: { not_equals: 349 } }", 'fresh discovery Product 349 exclusion')
assert.ok(!/payload\.(?:create|update|delete)|payload\.jobs\.(?:queue|run)|sendTelegram|approveImage|rejectImage|generateProductImages/.test(freshDiscoveryScript), 'fresh discovery runtime must expose no mutation, queue, Telegram, approval, or generation call')
assert.ok(!/\b(?:INSERT|UPDATE|DELETE|ALTER|DROP|CREATE|TRUNCATE)\b/i.test(freshDiscoveryResources), 'fresh discovery runtime resources must remain read-only')

const controlledCandidateScript = read('scripts/controlled-fresh-candidate-runtime.ts')
const controlledCandidateResources = read('scripts/controlled-fresh-candidate-runtime-resources.ts')
const controlledCandidateSecretContract = read('scripts/controlled-fresh-candidate-secret-contract.ts')
const controlledCandidateSecretLoader = read('scripts/controlled-fresh-candidate-secret-loader.ts')
const controlledCandidateSecretBootstrap = read('scripts/controlled-fresh-candidate-secret-bootstrap.ts')
const controlledCandidateConnectivity = read('scripts/controlled-fresh-candidate-connectivity.ts')
const controlledCandidateConnectivityTest = read('scripts/controlled-fresh-candidate-connectivity.test.ts')
const controlledCandidateConnectivityBounded = controlledCandidateConnectivity.slice(
  controlledCandidateConnectivity.indexOf('async function bounded'),
  controlledCandidateConnectivity.indexOf('function exactReadOnlyResult'),
)
const controlledCandidateConnectivityQueryBlock = controlledCandidateConnectivity.slice(
  controlledCandidateConnectivity.indexOf('CONTROLLED_FRESH_CANDIDATE_CONNECTIVITY_QUERIES'),
  controlledCandidateConnectivity.indexOf('] as const)', controlledCandidateConnectivity.indexOf('CONTROLLED_FRESH_CANDIDATE_CONNECTIVITY_QUERIES')) + '] as const)'.length,
)
const controlledCandidateCreation = read('src/lib/controlledFreshCandidateCreation.ts')
const controlledCandidateReceipt = read('src/lib/controlledFreshCandidateReceipt.ts')
const controlledCandidateVerifier = read('src/lib/controlledFreshCandidateTargetVerifier.ts')
const controlledCandidateTests = scripts['test:controlled-fresh-candidate'] ?? ''
assertIncludes(controlledCandidateTests, 'controlledFreshCandidateCreation.test.ts', 'controlled candidate creation tests')
assertIncludes(controlledCandidateTests, 'controlledFreshCandidateAuthorization.test.ts', 'controlled candidate authorization tests')
assertIncludes(controlledCandidateTests, 'controlledFreshCandidateObservation.test.ts', 'controlled candidate observation tests')
assertIncludes(controlledCandidateTests, 'controlledFreshCandidateTargetVerifier.test.ts', 'controlled candidate verifier tests')
assertIncludes(controlledCandidateTests, 'controlled-fresh-candidate-readiness.test.ts', 'controlled candidate readiness tests')
assertIncludes(controlledCandidateTests, 'controlled-fresh-candidate-secret-loader.test.ts', 'controlled candidate loader tests')
assertIncludes(controlledCandidateTests, 'controlled-fresh-candidate-secret-bootstrap.test.ts', 'controlled candidate bootstrap tests')
assertIncludes(controlledCandidateTests, 'controlled-fresh-candidate-connectivity.test.ts', 'controlled candidate connectivity tests')
assertIncludes(controlledCandidateTests, 'controlled-fresh-candidate-runtime.test.ts', 'controlled candidate runtime tests')
assertIncludes(scripts['test:safe'] ?? '', 'npm run test:controlled-fresh-candidate', 'safe suite controlled candidate tests')
assert.ok(!(scripts['test:safe'] ?? '').includes('smoke:controlled-fresh-candidate'), 'test:safe must not execute controlled candidate runtime')
assert.deepEqual(
  Object.keys(scripts).filter((name) => name.includes('controlled-fresh-candidate')).sort(),
  [
    'controlled-fresh-candidate:bootstrap',
    'controlled-fresh-candidate:connectivity',
    'controlled-fresh-candidate:observe',
    'controlled-fresh-candidate:package',
    'controlled-fresh-candidate:readiness',
    'test:controlled-fresh-candidate',
    'test:controlled-fresh-candidate-bootstrap',
    'test:controlled-fresh-candidate-connectivity',
    'test:controlled-fresh-candidate-loader',
    'test:controlled-fresh-candidate-readiness',
  ],
  'controlled candidate exposes only governed bootstrap, readiness, connectivity, offline preparation, read-only observation, and tests',
)
assertIncludes(scripts['controlled-fresh-candidate:package'] ?? '', 'controlled-fresh-candidate-package-builder.ts', 'controlled offline package command')
assertIncludes(scripts['controlled-fresh-candidate:readiness'] ?? '', 'controlled-fresh-candidate-secret-contract.ts', 'controlled secret readiness command')
assertIncludes(scripts['controlled-fresh-candidate:bootstrap'] ?? '', 'controlled-fresh-candidate-secret-bootstrap.ts', 'controlled secret bootstrap command')
assertIncludes(scripts['controlled-fresh-candidate:connectivity'] ?? '', 'controlled-fresh-candidate-connectivity.ts', 'controlled connectivity command')
assertIncludes(scripts['controlled-fresh-candidate:observe'] ?? '', 'controlled-fresh-candidate-observer.ts', 'controlled read-only observer command')
assertIncludes(controlledCandidateScript, '--confirm-controlled-fresh-candidate-create', 'controlled creation exact confirmation')
assertIncludes(controlledCandidateScript, '--confirm-controlled-fresh-candidate-receipt-verification', 'controlled verification exact confirmation')
assertIncludes(controlledCandidateScript, 'RUNTIME_MODES_MIXED', 'controlled mutually exclusive modes')
assertIncludes(controlledCandidateScript, "process.env.PAYLOAD_DB_PUSH = 'false'", 'controlled DB push boundary')
assertIncludes(controlledCandidateScript, "process.env.PAYLOAD_DROP_DATABASE = 'false'", 'controlled database-drop boundary')
assert.ok(!controlledCandidateScript.includes('process.exit('), 'controlled runtime must terminate naturally')
assertIncludes(controlledCandidateResources, 'CONTROLLED_FRESH_CANDIDATE_BLOB_RETRY_BUDGET = 0', 'controlled Blob zero retry')
assertIncludes(controlledCandidateResources, 'multipart: false', 'controlled Blob multipart disabled')
assertIncludes(controlledCandidateResources, "handleDelete: async () => { throw", 'controlled storage delete denied')
assertIncludes(controlledCandidateResources, 'fsConstants.O_CREAT | fsConstants.O_EXCL | fsConstants.O_WRONLY | fsConstants.O_NOFOLLOW', 'controlled one-use authorization marker')
assertIncludes(controlledCandidateResources, 'syncDirectory(params.directoryHandle)', 'controlled durable marker directory acknowledgement')
assertIncludes(controlledCandidateResources, 'CONTROLLED_FRESH_CANDIDATE_EXT4_MAGIC', 'controlled native ext4 boundary')
assertIncludes(controlledCandidateScript, 'POSIX_RUNTIME_REQUIRED', 'controlled Windows fail-closed boundary')
assertIncludes(controlledCandidateScript, 'EXECUTION_READINESS_REQUIRED', 'controlled execution-stage readiness boundary')
assertIncludes(controlledCandidateScript, "options.testOnlyBypassExecutionReadiness === true\n    && process.env.NODE_ENV === 'test'", 'controlled test-only readiness bypass boundary')
assertIncludes(controlledCandidateSecretContract, 'controlled-fresh-candidate-secret-contract/v2', 'controlled two-stage readiness contract')
assertIncludes(controlledCandidateSecretContract, "stage: 'configuration'", 'controlled configuration readiness stage')
assertIncludes(controlledCandidateSecretContract, 'operationPackageAuthenticated', 'controlled execution package authentication requirement')
assertIncludes(controlledCandidateSecretLoader, '/home/w11/.config/uygunayakkabi/controlled-fresh-candidate/runtime-secrets.env', 'controlled canonical native-WSL secret source')
assertIncludes(controlledCandidateSecretLoader, 'Object.create(null)', 'controlled null-prototype environment')
assertIncludes(controlledCandidateSecretLoader, 'fsConstants.O_NOFOLLOW', 'controlled secret no-follow open')
assertIncludes(controlledCandidateSecretLoader, 'pathBefore.nlink !== 1n', 'controlled secret single-link boundary')
assertIncludes(controlledCandidateSecretLoader, 'CONTROLLED_FRESH_CANDIDATE_EXT4_MAGIC', 'controlled secret ext4 boundary')
assertIncludes(controlledCandidateSecretLoader, 'timingSafeEqual(authorizationKey, receiptKey)', 'controlled independent key enforcement')
assertIncludes(controlledCandidateSecretLoader, 'CONTROLLED_CONFIGURATION_FILE_CLEANUP_UNCERTAIN', 'controlled loader cleanup uncertainty code')
assertIncludes(controlledCandidateSecretLoader, 'authoritativeFailureCaptured', 'controlled loader authoritative failure precedence')
assertIncludes(controlledCandidateSecretLoader, '(options.testOnly?.closeHandle ?? closeSync)(handle)', 'controlled loader exactly-once close adapter')
assert.ok(!/\b(?:exec|execFile|spawn|fork)\s*\(/u.test(controlledCandidateSecretLoader), 'controlled loader must not execute a process')
assert.ok(!/\b(?:eval|source)\s*\(/u.test(controlledCandidateSecretLoader), 'controlled loader must not evaluate shell content')
assertIncludes(controlledCandidateSecretBootstrap, 'fsConstants.O_EXCL', 'controlled bootstrap exclusive temp creation')
assertIncludes(controlledCandidateSecretBootstrap, 'linkSync(temporaryPath, destinationPath)', 'controlled bootstrap no-overwrite atomic publication')
assertIncludes(controlledCandidateSecretBootstrap, 'fsyncDirectory(directoryPath', 'controlled bootstrap directory durability')
assertIncludes(controlledCandidateConnectivity, "'BEGIN TRANSACTION READ ONLY'", 'controlled connectivity explicit read-only transaction')
assertIncludes(controlledCandidateConnectivity, "'SHOW transaction_read_only'", 'controlled connectivity server read-only assertion')
assertIncludes(controlledCandidateConnectivity, "'SELECT 1 AS controlled_liveness'", 'controlled connectivity constant liveness query')
assertIncludes(controlledCandidateConnectivity, "'ROLLBACK'", 'controlled connectivity rollback')
assertIncludes(controlledCandidateConnectivity, 'closeCalls = 1', 'controlled connectivity exactly-once close accounting')
assert.ok(!controlledCandidateConnectivityBounded.includes('.unref()'), 'controlled connectivity timeout must remain process-live')
assertIncludes(controlledCandidateConnectivityTest, 'const DIRECT_CASE_COUNT = CORE_CASE_COUNT + PARENT_COMPLETION_CASE_COUNT', 'controlled connectivity exact completion count')
assertIncludes(controlledCandidateConnectivityTest, 'parent rejects reproduced empty-output exit-zero vulnerability', 'controlled connectivity parent completion integrity')
assertIncludes(controlledCandidateConnectivityTest, 'connectivity-unref-early-exit', 'controlled connectivity early-exit source mutation')
assertIncludes(controlledCandidateConnectivityTest, 'semantic mutation runtime-accepts-configuration-stage', 'controlled runtime readiness source mutation')
assertIncludes(controlledCandidateConnectivityTest, 'MUTATION_HARNESS_OK:', 'controlled semantic mutation child sentinel')
assertIncludes(controlledCandidateConnectivityTest, 'CONTROLLED_CONNECTIVITY_TEST_INCOMPLETE', 'controlled connectivity referenced runner watchdog')
assertIncludes(controlledCandidateConnectivity, "await import('pg')", 'controlled connectivity installed direct pg client')
assert.ok(!controlledCandidateConnectivity.includes('payload'), 'controlled connectivity must not initialize Payload')
assert.ok(controlledCandidateConnectivityQueryBlock.length > '] as const)'.length, 'controlled connectivity query block must be present')
assert.ok(!/\b(?:INSERT|UPDATE|DELETE|ALTER|DROP|CREATE|TRUNCATE|COPY|MERGE)\b/iu.test(controlledCandidateConnectivityQueryBlock), 'controlled connectivity must contain no mutation query')
assert.ok(!/\b(?:products?|media|349)\b/iu.test(controlledCandidateConnectivityQueryBlock), 'controlled connectivity must contain no Product or Media query')
assertIncludes(controlledCandidateResources, 'controlledFreshCandidateFilenameIsApproved(expected, data.filename)', 'controlled pre-upload filename equality')
assertIncludes(controlledCandidateResources, 'overwriteExistingFiles: false', 'controlled overwrite disabled')
assertIncludes(controlledCandidateResources, 'tasks: []', 'controlled Payload jobs disabled')
assertIncludes(controlledCandidateResources, 'push: false', 'controlled adapter schema push disabled')
assertIncludes(controlledCandidateResources, 'disableCreateDatabase: true', 'controlled adapter database creation disabled')
assertIncludes(controlledCandidateResources, 'controlled_runtime_database_management_forbidden', 'controlled adapter database management refusal')
assertIncludes(controlledCandidateResources, "createDatabase: { configurable: false", 'controlled adapter create authority sealed')
assertIncludes(controlledCandidateResources, "dropDatabase: { configurable: false", 'controlled adapter drop authority sealed')
assert.ok(!/blobModule\.(?:del|list|head)|sendTelegram|generateProductImages|queueShopierSync/.test(controlledCandidateResources), 'controlled resources must expose no storage recovery, Telegram, generation, or dispatch path')
assertIncludes(controlledCandidateCreation, "status: 'draft'", 'controlled Product draft invariant')
assertIncludes(controlledCandidateCreation, 'sellable: false', 'controlled Product non-sellable invariant')
assertIncludes(controlledCandidateCreation, 'eligibleForPublishing: false', 'controlled public publishing denial')
assertControlledReceiptSemanticGovernance()
assertIncludes(controlledCandidateReceipt, "createHmac('sha256'", 'controlled receipt HMAC')
assertIncludes(controlledCandidateReceipt, 'timingSafeEqual', 'controlled receipt constant-time authentication')
assertIncludes(controlledCandidateReceipt, 'CONTROLLED_RECEIPT_REPLAYED', 'controlled receipt replay refusal')
assertIncludes(controlledCandidateVerifier, 'captureFreshVisualStrictTargetSnapshot', 'controlled two-snapshot target evidence')
assertIncludes(controlledCandidateVerifier, 'STRICT_TARGET_STATE_DRIFTED', 'controlled target drift refusal')
assertIncludes(controlledCandidateVerifier, 'eligibleForVisualOnlyGeneration', 'controlled visual-only eligibility output')

const blogApplyScript = read('scripts/blog-featured-image-schema-apply.ts')
const blogCheckScript = read('scripts/blog-featured-image-schema-check.ts')
const blogSqlPlan = read('scripts/sql/d462-blog-featured-image-schema.sql')
assertIncludes(blogApplyScript, '--confirm-apply-d462-blog-featured-image-schema', 'D-462 apply confirmation')
assertIncludes(blogApplyScript, 'Dry-run only: no database connection opened and no DDL executed.', 'D-462 apply dry-run guard')
assertIncludes(blogApplyScript, 'Apply confirmation was supplied, but no apply intent was supplied.', 'D-462 apply intent guard')
assertIncludes(blogApplyScript, 'mediaIdIsInteger', 'D-462 apply media ID type guard')
assertIncludes(blogApplyScript, 'featuredImageColumnTypeCompatible', 'D-462 apply relationship ID type guard')
assertIncludes(blogApplyScript, 'featuredImageForeignKeyConflict', 'D-462 apply foreign-key conflict guard')
assertIncludes(blogCheckScript, 'isExpectedFeaturedImageForeignKey', 'D-462 preflight exact foreign-key guard')
assertIncludes(blogCheckScript, "delete_action === 'n'", 'D-462 preflight set-null guard')
assertIncludes(blogSqlPlan, 'ADD COLUMN IF NOT EXISTS featured_image_id integer', 'D-462 additive relationship column')
assertIncludes(blogSqlPlan, 'FOREIGN KEY (featured_image_id) REFERENCES media(id) ON DELETE SET NULL', 'D-462 relationship foreign key')
assertIncludes(blogSqlPlan, "target_column.attname = 'id'", 'D-462 SQL target-column guard')
assertIncludes(blogSqlPlan, "constraint_info.confdeltype = 'n'", 'D-462 SQL delete-action guard')

const runtimeRunbook = read('project-control/RUNTIME_SMOKE_CHECKS.md')
assertIncludes(runtimeRunbook, 'Runtime Smoke Governance', 'runtime smoke runbook governance section')
assertIncludes(runtimeRunbook, 'test:runtime-smokes', 'runtime smoke runbook validation mention')

const validationOps = read('chatgpt-project-sources/13_VALIDATION_DEPLOYMENT_OPS.md')
assertIncludes(validationOps, 'runtime-smoke governance assertions', 'source-pack validation status')
assertIncludes(validationOps, 'test:runtime-smokes', 'source-pack validation script list')

console.log(`runtimeSmokeGovernance: ${readOnlySmokes.length} read-only smoke commands checked - ALL OK`)
