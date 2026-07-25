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

  const source = read(smoke.scriptPath)
  assertIncludes(source, '--confirm-read-only', `${smoke.name} confirmation flag`)
  assertIncludes(source, 'READ_ONLY', `${smoke.name} READ_ONLY env/confirmation`)
  assertIncludes(source, 'mutationRequested', `${smoke.name} mutation refusal state`)
  assertIncludes(source, 'Refusing to', `${smoke.name} refusal path`)
  assertNoWriteWording(source, smoke.name)

  if (smoke.requiresPayloadPushFalse) {
    assertIncludes(source, "process.env.PAYLOAD_DB_PUSH = 'false'", `${smoke.name} schema-push guard`)
    assertIncludes(source, 'PAYLOAD_DB_PUSH: false', `${smoke.name} schema-push output`)
  }

  for (const needle of smoke.extraNeedles ?? []) {
    assertIncludes(source, needle, `${smoke.name} extra guardrail`)
  }

  for (const [docPath, label] of docsToCheck) {
    assertCommandDocumentedNearConfirmation(read(docPath), smoke.name, label)
  }
}

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
