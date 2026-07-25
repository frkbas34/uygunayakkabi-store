import assert from 'node:assert'
import { buildOperatorSmokePlan, formatOperatorSmokePlan } from './operatorSmokePlan'

let passed = 0

function check(name: string, fn: () => void) {
  try {
    fn()
    passed += 1
    console.log(`  ok - ${name}`)
  } catch (e) {
    console.error(`  fail - ${name}\n    ${(e as Error).message}`)
    process.exitCode = 1
  }
}

const plan = buildOperatorSmokePlan(new Date('2026-07-03T12:30:00.000Z'))
const formatted = formatOperatorSmokePlan(plan)

check('keeps active-channel truth explicit', () => {
  assert.deepStrictEqual(plan.activeChannels, ['Website', 'Instagram', 'Facebook', 'X', 'Shopier'])
  assert.ok(formatted.includes('Active channels: Website, Instagram, Facebook, X, Shopier'))
})

check('starts with repo read-only load-plan preflight', () => {
  assert.strictEqual(plan.steps[0]?.id, 'load-plan-runtime')
  assert.strictEqual(plan.steps[0]?.command, 'npm run smoke:load-plan:read -- --confirm-read-only')
})

check('runs Telegram access governance before any live Telegram read', () => {
  const commands = plan.steps.map((step) => step.command)
  const accessIndex = commands.indexOf('npm run test:telegram-access')
  const firstTelegramIndex = plan.steps.findIndex((step) => step.kind === 'telegram_read')

  assert.ok(accessIndex > -1, 'plan should include Telegram access governance')
  assert.ok(firstTelegramIndex > -1, 'plan should include Telegram reads')
  assert.ok(accessIndex < firstTelegramIndex, 'Telegram access check should run before any Telegram read')
  assert.ok(formatted.includes('private Telegram access allowlist behavior'))
  assert.ok(formatted.includes('Run Telegram access checks before any live Telegram read.'))
})

check('covers Telegram operator reads without writes', () => {
  const commands = plan.steps.map((step) => step.command)
  assert.ok(commands.includes('npm run test:telegram-access'))
  assert.ok(commands.includes('/loadplan'))
  assert.ok(commands.includes('/brandplan'))
  assert.ok(commands.includes('/imageqcplan'))
  assert.ok(commands.includes('/diagnostics'))
  assert.ok(commands.includes('/productflow <id-or-sn>'))
  assert.ok(commands.includes('/imageplan <id-or-sn>'))
  assert.ok(commands.includes('/business then /funnel week'))
  assert.ok(commands.includes('/leadplan'))
  assert.ok(commands.includes('npm run test:storefront-trust'))
  assert.ok(commands.includes('npm run test:inquiry-guard'))
  assert.ok(commands.includes('npm run test:attribution'))
  assert.ok(commands.includes('npm run test:sitemap-entries'))
  assert.ok(commands.includes('/adready <id-or-sn>'))
  assert.ok(commands.includes('/adreport week'))
  assert.ok(commands.includes('/shopier dashboard, /shopier publish-ready, /shopier errors, /shopier retry-errors'))
})

check('uses the load-plan brand queue and productflow handoff before provider diagnostics', () => {
  const commands = plan.steps.map((step) => step.command)
  const loadPlanIndex = commands.indexOf('/loadplan')
  const brandRuntimeIndex = commands.indexOf('npm run smoke:brand-safety:read -- --confirm-read-only')
  const brandTelegramIndex = commands.indexOf('/brandplan')
  const imageQcRuntimeIndex = commands.indexOf('npm run smoke:image-qc-plan:read -- --confirm-read-only')
  const imageQcTelegramIndex = commands.indexOf('/imageqcplan')
  const productFlowRuntimeIndex = commands.indexOf('npm run smoke:product-flow:read -- --product=<id-or-sn> --confirm-read-only')
  const productFlowTelegramIndex = commands.indexOf('/productflow <id-or-sn>')
  const providerRuntimeIndex = commands.indexOf('npm run smoke:provider-health:read -- --confirm-read-only')

  assert.ok(loadPlanIndex > -1, 'plan should include Telegram /loadplan read')
  assert.ok(brandRuntimeIndex > -1, 'plan should include protected-brand runtime smoke')
  assert.ok(brandTelegramIndex > -1, 'plan should include Telegram /brandplan read')
  assert.ok(imageQcRuntimeIndex > -1, 'plan should include Image QC remediation runtime smoke')
  assert.ok(imageQcTelegramIndex > -1, 'plan should include Telegram /imageqcplan read')
  assert.ok(productFlowRuntimeIndex > -1, 'plan should include product-flow read-only runtime smoke')
  assert.ok(productFlowTelegramIndex > -1, 'plan should include Telegram /productflow read')
  assert.ok(providerRuntimeIndex > -1, 'plan should include provider-health smoke')
  assert.ok(loadPlanIndex < productFlowRuntimeIndex, 'load-plan worklist should choose the product-flow product')
  assert.ok(brandRuntimeIndex < brandTelegramIndex, 'repo protected-brand smoke should run before Telegram /brandplan')
  assert.ok(brandRuntimeIndex < imageQcRuntimeIndex, 'protected-brand remediation should run before Image QC batch review')
  assert.ok(imageQcRuntimeIndex < imageQcTelegramIndex, 'repo Image QC queue should run before Telegram /imageqcplan')
  assert.ok(imageQcTelegramIndex < productFlowRuntimeIndex, 'batch Image QC visibility should happen before the selected product flow')
  assert.ok(brandTelegramIndex < productFlowRuntimeIndex, 'protected-brand queue should be reviewed before selecting a product-flow remediation')
  assert.ok(productFlowRuntimeIndex < productFlowTelegramIndex, 'repo product-flow smoke should run before Telegram /productflow')
  assert.ok(productFlowTelegramIndex < providerRuntimeIndex, 'worklist-selected product-flow visibility should happen before provider diagnostics')
  assert.ok(formatted.includes('D-425 /productflow handoff'))
  assert.ok(formatted.includes('matched protected brands/fields'))
  assert.ok(formatted.includes('Use the first /loadplan worklist flow command'))
})

check('runs lead follow-up runtime smoke before Telegram leadplan', () => {
  const commands = plan.steps.map((step) => step.command)
  const businessIndex = commands.indexOf('npm run smoke:business-funnel:read -- --period=week --confirm-read-only')
  const runtimeIndex = commands.indexOf('npm run smoke:lead-followup:read -- --confirm-read-only')
  const telegramIndex = commands.indexOf('/leadplan')
  const shopierIndex = commands.indexOf('npm run test:shopier-webhook-local')

  assert.ok(runtimeIndex > -1, 'plan should include lead-followup read-only runtime smoke')
  assert.ok(telegramIndex > -1, 'plan should include Telegram /leadplan read')
  assert.ok(businessIndex < runtimeIndex, 'lead-followup smoke should run after business/funnel visibility')
  assert.ok(runtimeIndex < telegramIndex, 'repo lead-followup smoke should run before Telegram /leadplan')
  assert.ok(telegramIndex < shopierIndex, 'lead follow-up visibility should happen before Shopier queue smoke')
})

check('runs storefront trust, inquiry guard, attribution, and sitemap before manual ad preflights and Shopier queue checks', () => {
  const commands = plan.steps.map((step) => step.command)
  const leadIndex = commands.indexOf('/leadplan')
  const storefrontTrustIndex = commands.indexOf('npm run test:storefront-trust')
  const inquiryGuardIndex = commands.indexOf('npm run test:inquiry-guard')
  const attributionIndex = commands.indexOf('npm run test:attribution')
  const sitemapIndex = commands.indexOf('npm run test:sitemap-entries')
  const adReadyRuntimeIndex = commands.indexOf('npm run smoke:ad-readiness:read -- --product=<id-or-sn> --confirm-read-only')
  const adReadyTelegramIndex = commands.indexOf('/adready <id-or-sn>')
  const adReportRuntimeIndex = commands.indexOf('npm run smoke:ad-performance:read -- --confirm-read-only')
  const adReportTelegramIndex = commands.indexOf('/adreport week')
  const shopierIndex = commands.indexOf('npm run test:shopier-webhook-local')

  assert.ok(leadIndex > -1, 'plan should include lead follow-up visibility first')
  assert.ok(storefrontTrustIndex > -1, 'plan should include storefront trust check')
  assert.ok(inquiryGuardIndex > -1, 'plan should include inquiry guard check')
  assert.ok(attributionIndex > -1, 'plan should include attribution check')
  assert.ok(sitemapIndex > -1, 'plan should include sitemap check')
  assert.ok(adReadyRuntimeIndex > -1, 'plan should include ad-readiness runtime smoke')
  assert.ok(adReadyTelegramIndex > -1, 'plan should include Telegram /adready read')
  assert.ok(adReportRuntimeIndex > -1, 'plan should include ad-performance runtime smoke')
  assert.ok(adReportTelegramIndex > -1, 'plan should include Telegram /adreport read')
  assert.ok(leadIndex < storefrontTrustIndex, 'lead visibility should happen before storefront trust check')
  assert.ok(storefrontTrustIndex < inquiryGuardIndex, 'storefront trust check should happen before inquiry guard')
  assert.ok(inquiryGuardIndex < attributionIndex, 'inquiry guard check should happen before attribution')
  assert.ok(attributionIndex < sitemapIndex, 'attribution check should happen before sitemap')
  assert.ok(sitemapIndex < adReadyRuntimeIndex, 'sitemap check should happen before ad readiness')
  assert.ok(adReadyRuntimeIndex < adReadyTelegramIndex, 'repo ad-readiness smoke should run before Telegram /adready')
  assert.ok(adReadyTelegramIndex < adReportRuntimeIndex, 'product ad readiness should happen before ad reporting')
  assert.ok(adReportRuntimeIndex < adReportTelegramIndex, 'repo ad-performance smoke should run before Telegram /adreport')
  assert.ok(adReportTelegramIndex < shopierIndex, 'ad visibility should happen before Shopier queue preflights')
  assert.ok(formatted.includes('no fake reviews or placeholder testimonials'))
  assert.ok(formatted.includes('honeypot, rate-limit, duplicate-collapse'))
  assert.ok(formatted.includes('first-touch UTM/referrer capture'))
  assert.ok(formatted.includes('static routes plus website-visible product and blog sitemap entries'))
  assert.ok(formatted.includes('Run storefront trust checks before manual ad readiness.'))
  assert.ok(formatted.includes('Run inquiry guard checks before manual ad readiness.'))
  assert.ok(formatted.includes('Run attribution checks before manual ad readiness.'))
  assert.ok(formatted.includes('Run sitemap checks before manual ad readiness.'))
  assert.ok(formatted.includes('manual paid-traffic decision'))
  assert.ok(formatted.includes('Run ad readiness and ad performance as read-only evidence before any manual paid-traffic decision.'))
})

check('keeps ad preflights read-only and non-launching', () => {
  assert.ok(formatted.includes('npm run smoke:ad-readiness:read -- --product=&lt;id-or-sn&gt; --confirm-read-only'))
  assert.ok(formatted.includes('npm run smoke:ad-performance:read -- --confirm-read-only'))
  assert.ok(formatted.includes('/adready &lt;id-or-sn&gt;'))
  assert.ok(formatted.includes('/adreport week'))
  assert.ok(formatted.includes('no campaign, pixel, CAPI, API, or spend is created'))
})

check('runs image-plan runtime smoke before Telegram imageplan', () => {
  const commands = plan.steps.map((step) => step.command)
  const productFlowIndex = commands.indexOf('/productflow <id-or-sn>')
  const runtimeIndex = commands.indexOf('npm run smoke:image-plan:read -- --product=<id-or-sn> --confirm-read-only')
  const telegramIndex = commands.indexOf('/imageplan <id-or-sn>')

  assert.ok(runtimeIndex > -1, 'plan should include image-plan read-only runtime smoke')
  assert.ok(telegramIndex > -1, 'plan should include Telegram /imageplan read')
  assert.ok(productFlowIndex < runtimeIndex, 'image-plan smoke should run after product-flow visibility')
  assert.ok(runtimeIndex < telegramIndex, 'repo image-plan smoke should run before Telegram /imageplan')
})

check('runs local Shopier webhook checks before Shopier runtime smoke', () => {
  const commands = plan.steps.map((step) => step.command)
  const localIndex = commands.indexOf('npm run test:shopier-webhook-local')
  const runtimeIndex = commands.indexOf('npm run smoke:shopier:read -- --confirm-read-only')

  assert.ok(localIndex > -1, 'plan should include local Shopier webhook lifecycle preflight')
  assert.ok(runtimeIndex > -1, 'plan should include Shopier read-only runtime smoke')
  assert.ok(localIndex < runtimeIndex, 'local Shopier webhook checks should run before runtime Shopier smoke')
  assert.ok(formatted.includes('repo check'))
})

check('uses Shopier preview row product-flow handoffs before the final queue hold', () => {
  const commands = plan.steps.map((step) => step.command)
  const shopierTelegramIndex = commands.indexOf('/shopier dashboard, /shopier publish-ready, /shopier errors, /shopier retry-errors')
  const flowHandoffIndex = commands.indexOf('Use /productflow <ref> + npm run smoke:product-flow:read -- --product=<ref> --confirm-read-only')
  const finalHoldIndex = commands.indexOf('Operator approval required')

  assert.ok(shopierTelegramIndex > -1, 'plan should include Telegram Shopier previews')
  assert.ok(flowHandoffIndex > -1, 'plan should include Shopier row product-flow handoff hold')
  assert.ok(finalHoldIndex > -1, 'plan should include final approval hold')
  assert.ok(shopierTelegramIndex < flowHandoffIndex, 'Shopier previews should expose row handoffs first')
  assert.ok(flowHandoffIndex < finalHoldIndex, 'row product-flow handoffs should happen before final queue hold')
  assert.ok(formatted.includes('D-428/D-429 row product-flow handoffs'))
  assert.ok(formatted.includes('Use /productflow &lt;ref&gt; + npm run smoke:product-flow:read -- --product=&lt;ref&gt; --confirm-read-only'))
})

check('verifies Shopier credentials after row handoffs and before queue approval', () => {
  const commands = plan.steps.map((step) => step.command)
  const flowHandoffIndex = commands.indexOf('Use /productflow <ref> + npm run smoke:product-flow:read -- --product=<ref> --confirm-read-only')
  const credentialIndex = commands.indexOf('Verify SHOPIER_PAT and Shopier webhook readiness outside chat; do not paste secrets')
  const finalHoldIndex = commands.indexOf('Operator approval required')

  assert.ok(flowHandoffIndex > -1, 'plan should include Shopier row product-flow handoff hold')
  assert.ok(credentialIndex > -1, 'plan should include Shopier credential readiness hold')
  assert.ok(finalHoldIndex > -1, 'plan should include final approval hold')
  assert.ok(flowHandoffIndex < credentialIndex, 'credential verification should happen after row product-flow handoffs')
  assert.ok(credentialIndex < finalHoldIndex, 'credential verification should happen before final queue hold')
  assert.ok(formatted.includes('Verify SHOPIER_PAT and Shopier webhook readiness outside chat; do not paste secrets'))
  assert.ok(formatted.includes('Verify Shopier credentials and webhook readiness before any Shopier confirm action'))
})

check('ends on an explicit operator hold', () => {
  const last = plan.steps.at(-1)
  assert.strictEqual(last?.kind, 'operator_hold')
  assert.strictEqual(last?.command, 'Operator approval required')
})

check('formatter is Telegram friendly and reinforces approval boundary', () => {
  assert.ok(formatted.includes('Operator Live Smoke Plan (D-389/D-452)'))
  assert.ok(formatted.includes('Confirm/queue/publish variants stay off'))
  assert.ok(formatted.includes('Use Shopier row product-flow handoffs before any Shopier confirm action'))
  assert.ok(formatted.includes('No SupplierScout activation'))
  assert.ok(formatted.includes('No retired-channel activation'))
})

check('does not include unsafe queue, publish, redispatch, or ad commands', () => {
  const forbidden = [
    '/shopier publish-ready confirm',
    '/shopier retry-errors confirm',
    '/shopier publish <id>',
    '/shopier republish <id>',
    'live webhook smoke confirm',
    '/redispatch',
    '/activate',
    '/adlaunch',
    '/adpack',
  ]
  for (const needle of forbidden) {
    assert.ok(!formatted.includes(needle), `formatted plan must not include ${needle}`)
  }
})

console.log(`\noperatorSmokePlan: ${passed} checks passed${process.exitCode ? ' - WITH FAILURES' : ' - ALL OK'}`)
