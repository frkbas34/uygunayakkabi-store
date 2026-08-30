import assert from 'node:assert'
import { existsSync, readFileSync } from 'node:fs'

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
const controlledCandidateCreation = read('src/lib/controlledFreshCandidateCreation.ts')
const controlledCandidateReceipt = read('src/lib/controlledFreshCandidateReceipt.ts')
const controlledCandidateVerifier = read('src/lib/controlledFreshCandidateTargetVerifier.ts')
const controlledCandidateTests = scripts['test:controlled-fresh-candidate'] ?? ''
assertIncludes(controlledCandidateTests, 'controlledFreshCandidateCreation.test.ts', 'controlled candidate creation tests')
assertIncludes(controlledCandidateTests, 'controlledFreshCandidateTargetVerifier.test.ts', 'controlled candidate verifier tests')
assertIncludes(controlledCandidateTests, 'controlled-fresh-candidate-runtime.test.ts', 'controlled candidate runtime tests')
assertIncludes(scripts['test:safe'] ?? '', 'npm run test:controlled-fresh-candidate', 'safe suite controlled candidate tests')
assert.ok(!(scripts['test:safe'] ?? '').includes('smoke:controlled-fresh-candidate'), 'test:safe must not execute controlled candidate runtime')
assert.ok(!Object.keys(scripts).some((name) => name !== 'test:controlled-fresh-candidate' && name.includes('controlled-fresh-candidate')), 'controlled candidate must have no routine runtime npm command')
assertIncludes(controlledCandidateScript, '--confirm-controlled-fresh-candidate-create', 'controlled creation exact confirmation')
assertIncludes(controlledCandidateScript, '--confirm-controlled-fresh-candidate-receipt-verification', 'controlled verification exact confirmation')
assertIncludes(controlledCandidateScript, 'RUNTIME_MODES_MIXED', 'controlled mutually exclusive modes')
assertIncludes(controlledCandidateScript, "process.env.PAYLOAD_DB_PUSH = 'false'", 'controlled DB push boundary')
assert.ok(!controlledCandidateScript.includes('process.exit('), 'controlled runtime must terminate naturally')
assertIncludes(controlledCandidateResources, 'CONTROLLED_FRESH_CANDIDATE_BLOB_RETRY_BUDGET = 0', 'controlled Blob zero retry')
assertIncludes(controlledCandidateResources, 'multipart: false', 'controlled Blob multipart disabled')
assertIncludes(controlledCandidateResources, "handleDelete: async () => { throw", 'controlled storage delete denied')
assertIncludes(controlledCandidateResources, 'fsConstants.O_CREAT | fsConstants.O_EXCL | fsConstants.O_WRONLY | fsConstants.O_NOFOLLOW', 'controlled one-use authorization marker')
assertIncludes(controlledCandidateResources, 'syncDirectory(params.directoryHandle)', 'controlled durable marker directory acknowledgement')
assertIncludes(controlledCandidateResources, 'CONTROLLED_FRESH_CANDIDATE_EXT4_MAGIC', 'controlled native ext4 boundary')
assertIncludes(controlledCandidateScript, 'POSIX_RUNTIME_REQUIRED', 'controlled Windows fail-closed boundary')
assertIncludes(controlledCandidateResources, 'controlledFreshCandidateFilenameIsApproved(expected, data.filename)', 'controlled pre-upload filename equality')
assertIncludes(controlledCandidateResources, 'overwriteExistingFiles: false', 'controlled overwrite disabled')
assertIncludes(controlledCandidateResources, 'tasks: []', 'controlled Payload jobs disabled')
assertIncludes(controlledCandidateResources, 'push: false', 'controlled adapter schema push disabled')
assert.ok(!/blobModule\.(?:del|list|head)|sendTelegram|generateProductImages|queueShopierSync/.test(controlledCandidateResources), 'controlled resources must expose no storage recovery, Telegram, generation, or dispatch path')
assertIncludes(controlledCandidateCreation, "status: 'draft'", 'controlled Product draft invariant')
assertIncludes(controlledCandidateCreation, 'sellable: false', 'controlled Product non-sellable invariant')
assertIncludes(controlledCandidateCreation, 'eligibleForPublishing: false', 'controlled public publishing denial')
assertIncludes(controlledCandidateReceipt, "controlled-fresh-candidate-private/v1", 'controlled private receipt version')
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
