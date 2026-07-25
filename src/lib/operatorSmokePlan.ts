export type SmokePlanStepKind = 'repo_smoke' | 'repo_check' | 'telegram_read' | 'operator_hold'

export interface SmokePlanStep {
  id: string
  kind: SmokePlanStepKind
  title: string
  command: string
  reason: string
}

export interface OperatorSmokePlan {
  title: string
  generatedAt: string
  activeChannels: string[]
  steps: SmokePlanStep[]
  guardrails: string[]
}

const ACTIVE_CHANNEL_LABELS = ['Website', 'Instagram', 'Facebook', 'X', 'Shopier']

export function buildOperatorSmokePlan(now = new Date()): OperatorSmokePlan {
  return {
    title: 'Operator Live Smoke Plan',
    generatedAt: now.toISOString(),
    activeChannels: [...ACTIVE_CHANNEL_LABELS],
    steps: [
      {
        id: 'load-plan-runtime',
        kind: 'repo_smoke',
        title: 'Preflight catalog loading plan',
        command: 'npm run smoke:load-plan:read -- --confirm-read-only',
        reason: 'Checks the real Payload catalog sample before relying on Telegram /loadplan.',
      },
      {
        id: 'telegram-access-check',
        kind: 'repo_check',
        title: 'Preflight Telegram operator access',
        command: 'npm run test:telegram-access',
        reason: 'Confirms private Telegram access allowlist behavior before any live Telegram operator read.',
      },
      {
        id: 'brand-safety-runtime',
        kind: 'repo_smoke',
        title: 'Preflight protected-brand remediation queue',
        command: 'npm run smoke:brand-safety:read -- --confirm-read-only',
        reason: 'Mirrors /brandplan against real products and shows matched protected brands/fields without rewriting, publishing, or changing product status.',
      },
      {
        id: 'image-qc-remediation-runtime',
        kind: 'repo_smoke',
        title: 'Preflight Image QC remediation queue',
        command: 'npm run smoke:image-qc-plan:read -- --confirm-read-only',
        reason: 'Mirrors /imageqcplan against real products, prioritizes protected-brand review before image work, and does not record QC or queue generation.',
      },
      {
        id: 'load-plan-telegram',
        kind: 'telegram_read',
        title: 'Read operator loading priorities',
        command: '/loadplan',
        reason: 'Confirms Telegram shows the same loading/fix priorities and D-425 /productflow handoff in operator language.',
      },
      {
        id: 'brand-safety-telegram',
        kind: 'telegram_read',
        title: 'Read protected-brand remediation queue',
        command: '/brandplan',
        reason: 'Shows grouped protected-brand blockers and product-flow handoffs before any provenance, edit, stop-sale, or publication decision.',
      },
      {
        id: 'image-qc-remediation-telegram',
        kind: 'telegram_read',
        title: 'Read Image QC remediation queue',
        command: '/imageqcplan',
        reason: 'Shows the batch Image QC backlog and read-only image-plan handoffs before any QC decision or generation command.',
      },
      {
        id: 'product-flow-runtime',
        kind: 'repo_smoke',
        title: 'Preflight one product flow',
        command: 'npm run smoke:product-flow:read -- --product=<id-or-sn> --confirm-read-only',
        reason: 'Use the first /loadplan worklist flow command; checks lifecycle, readiness, Image QC, Shopier gate, dispatch state, and next actions.',
      },
      {
        id: 'product-flow-telegram',
        kind: 'telegram_read',
        title: 'Read one Telegram product snapshot',
        command: '/productflow <id-or-sn>',
        reason: 'Confirms the worklist-selected product snapshot is understandable before any manual fix or publish work.',
      },
      {
        id: 'image-plan-runtime',
        kind: 'repo_smoke',
        title: 'Preflight image regeneration plan',
        command: 'npm run smoke:image-plan:read -- --product=<id-or-sn> --confirm-read-only',
        reason: 'Mirrors /imageplan against real Payload state before any live Telegram image planning or generation command.',
      },
      {
        id: 'image-plan-telegram',
        kind: 'telegram_read',
        title: 'Read image regeneration plan',
        command: '/imageplan <id-or-sn>',
        reason: 'Shows the safe next action for Image QC REVIEW/FAIL, preview approval, or regeneration without queueing work.',
      },
      {
        id: 'provider-health-runtime',
        kind: 'repo_smoke',
        title: 'Preflight active-channel provider health',
        command: 'npm run smoke:provider-health:read -- --confirm-read-only',
        reason: 'Shows Website, Instagram, Facebook, X, and Shopier readiness without printing secrets.',
      },
      {
        id: 'diagnostics-telegram',
        kind: 'telegram_read',
        title: 'Read Telegram diagnostics',
        command: '/diagnostics',
        reason: 'Confirms the bot-facing provider diagnostics match the repo smoke view.',
      },
      {
        id: 'business-funnel-runtime',
        kind: 'repo_smoke',
        title: 'Preflight business and funnel state',
        command: 'npm run smoke:business-funnel:read -- --period=week --confirm-read-only',
        reason: 'Reads leads, orders, attribution, and stock urgency without writes or ad spend.',
      },
      {
        id: 'business-funnel-telegram',
        kind: 'telegram_read',
        title: 'Read Telegram owner/funnel summaries',
        command: '/business then /funnel week',
        reason: 'Confirms operator-visible lead and funnel summaries before campaign or catalog decisions.',
      },
      {
        id: 'lead-followup-runtime',
        kind: 'repo_smoke',
        title: 'Preflight lead follow-up priorities',
        command: 'npm run smoke:lead-followup:read -- --confirm-read-only',
        reason: 'Builds the same open-lead next-action plan as /leadplan without writing leads or printing customer names/phones.',
      },
      {
        id: 'lead-followup-telegram',
        kind: 'telegram_read',
        title: 'Read Telegram lead follow-up plan',
        command: '/leadplan',
        reason: 'Confirms the operator-facing next-action list is clear before any manual lead follow-up or campaign work.',
      },
      {
        id: 'storefront-trust-check',
        kind: 'repo_check',
        title: 'Preflight storefront trust surface',
        command: 'npm run test:storefront-trust',
        reason: 'Confirms production storefront trust content has no fake reviews or placeholder testimonials before any paid-traffic readiness check.',
      },
      {
        id: 'inquiry-guard-check',
        kind: 'repo_check',
        title: 'Preflight lead-form inquiry guard',
        command: 'npm run test:inquiry-guard',
        reason: 'Confirms honeypot, rate-limit, duplicate-collapse, and safe lead-form fallback behavior before any paid-traffic readiness check.',
      },
      {
        id: 'attribution-check',
        kind: 'repo_check',
        title: 'Preflight attribution capture',
        command: 'npm run test:attribution',
        reason: 'Confirms first-touch UTM/referrer capture survives storefront navigation and lead submission before any paid-traffic readiness check.',
      },
      {
        id: 'sitemap-check',
        kind: 'repo_check',
        title: 'Preflight storefront sitemap',
        command: 'npm run test:sitemap-entries',
        reason: 'Confirms static routes plus website-visible product and blog sitemap entries degrade safely before any paid-traffic readiness check.',
      },
      {
        id: 'ad-readiness-runtime',
        kind: 'repo_smoke',
        title: 'Preflight manual ad readiness',
        command: 'npm run smoke:ad-readiness:read -- --product=<id-or-sn> --confirm-read-only',
        reason: 'Uses the worklist-selected product to check PDP, Image QC, stock/size, UTM, lead path, brand safety, and no-autonomous-spend before any manual paid-traffic thought.',
      },
      {
        id: 'ad-readiness-telegram',
        kind: 'telegram_read',
        title: 'Read Telegram ad readiness',
        command: '/adready <id-or-sn>',
        reason: 'Confirms the operator-facing product ad checklist is clear before any manual campaign draft work.',
      },
      {
        id: 'ad-performance-runtime',
        kind: 'repo_smoke',
        title: 'Preflight manual ad performance',
        command: 'npm run smoke:ad-performance:read -- --confirm-read-only',
        reason: 'Reads Payload UTM leads and related orders through the same helper as /adreport without ad-platform calls or spend.',
      },
      {
        id: 'ad-report-telegram',
        kind: 'telegram_read',
        title: 'Read Telegram ad report',
        command: '/adreport week',
        reason: 'Confirms campaign visibility before any manual paid-traffic decision; no campaign, pixel, CAPI, API, or spend is created.',
      },
      {
        id: 'shopier-webhook-local',
        kind: 'repo_check',
        title: 'Preflight Shopier webhook lifecycle',
        command: 'npm run test:shopier-webhook-local',
        reason: 'Checks order/refund stock reconciliation and refund idempotency locally before any live Shopier webhook smoke.',
      },
      {
        id: 'shopier-runtime',
        kind: 'repo_smoke',
        title: 'Preflight Shopier publish queue',
        command: 'npm run smoke:shopier:read -- --confirm-read-only',
        reason: 'Reads publish-ready, error, and retry candidates without queueing jobs or calling Shopier.',
      },
      {
        id: 'shopier-telegram',
        kind: 'telegram_read',
        title: 'Read Telegram Shopier dashboards',
        command: '/shopier dashboard, /shopier publish-ready, /shopier errors, /shopier retry-errors',
        reason: 'Confirms queue visibility, retry triage, and the D-428/D-429 row product-flow handoffs before any explicit queue approval.',
      },
      {
        id: 'shopier-flow-handoff',
        kind: 'operator_hold',
        title: 'Use Shopier row product-flow handoffs',
        command: 'Use /productflow <ref> + npm run smoke:product-flow:read -- --product=<ref> --confirm-read-only',
        reason: 'Run the exact row handoffs from /shopier dashboard, /shopier publish-ready, or /shopier retry-errors before any Shopier confirm action.',
      },
      {
        id: 'shopier-credential-hold',
        kind: 'operator_hold',
        title: 'Verify Shopier credentials and webhook readiness',
        command: 'Verify SHOPIER_PAT and Shopier webhook readiness outside chat; do not paste secrets',
        reason: 'Confirm credentials, webhook URL/token, account permission, and quota/readiness before any publish-ready or retry confirm command.',
      },
      {
        id: 'queue-hold',
        kind: 'operator_hold',
        title: 'Stop before queueing or publishing',
        command: 'Operator approval required',
        reason: 'Queueing, redispatch, live webhook tests, and any external publishing wait for credentials and explicit approval.',
      },
    ],
    guardrails: [
      'Read-only checks first.',
      'Run Telegram access checks before any live Telegram read.',
      'No product writes or status changes.',
      'No automatic protected-brand rewrite, stop-sale, activation, publish, redispatch, or ad action.',
      'No external dispatch or redispatch.',
      'No Shopier queueing or Shopier API calls from the plan.',
      'Use Shopier row product-flow handoffs before any Shopier confirm action.',
      'Verify Shopier credentials and webhook readiness before any Shopier confirm action.',
      'No provider calls or secret-value printing.',
      'Run storefront trust checks before manual ad readiness.',
      'Run inquiry guard checks before manual ad readiness.',
      'Run attribution checks before manual ad readiness.',
      'Run sitemap checks before manual ad readiness.',
      'Run ad readiness and ad performance as read-only evidence before any manual paid-traffic decision.',
      'No ad spend or ad-platform API calls.',
      'No SupplierScout activation.',
      'No retired-channel activation.',
    ],
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function compactDate(iso: string): string {
  return iso.slice(0, 16).replace('T', ' ')
}

function formatKind(kind: SmokePlanStepKind): string {
  switch (kind) {
    case 'repo_smoke': return 'repo smoke'
    case 'repo_check': return 'repo check'
    case 'telegram_read': return 'Telegram read'
    case 'operator_hold': return 'operator hold'
  }
}

export function formatOperatorSmokePlan(plan: OperatorSmokePlan): string {
  const lines = [
    '<b>Operator Live Smoke Plan (D-389/D-452)</b>',
    `Generated: <code>${compactDate(plan.generatedAt)}</code>`,
    `Active channels: ${plan.activeChannels.map(escapeHtml).join(', ')}`,
    '',
    '<b>Safe Order</b>',
  ]

  plan.steps.forEach((step, index) => {
    lines.push(
      `${index + 1}. <b>${escapeHtml(step.title)}</b> ` +
        `(${formatKind(step.kind)})`,
    )
    lines.push(`   <code>${escapeHtml(step.command)}</code>`)
    lines.push(`   ${escapeHtml(step.reason)}`)
  })

  lines.push('')
  lines.push('<b>Guardrails</b>')
  for (const guardrail of plan.guardrails) {
    lines.push(`- ${escapeHtml(guardrail)}`)
  }

  lines.push('')
  lines.push('<i>Read-only plan. Confirm/queue/publish variants stay off until the operator explicitly approves them.</i>')

  return lines.join('\n')
}
