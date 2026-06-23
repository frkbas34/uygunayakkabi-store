import assert from 'node:assert'
import {
  findProductChannelSelectionIssues,
  normalizeProductChannelSelection,
  resolveConfiguredTargets,
} from './productChannels'

let passed = 0

function check(name: string, fn: () => void) {
  try {
    fn()
    passed++
    console.log(`  ok - ${name}`)
  } catch (e) {
    console.error(`  fail - ${name}\n    ${(e as Error).message}`)
    process.exitCode = 1
  }
}

check('resolves the union of active channel targets and true publish flags', () => {
  assert.deepStrictEqual(
    resolveConfiguredTargets({
      channelTargets: ['website', 'instagram', 'dolap'],
      channels: { publishShopier: true, publishThreads: true },
    }),
    ['website', 'instagram', 'shopier'],
  )
})

check('normalizes selected targets into matching publish flags', () => {
  assert.deepStrictEqual(
    normalizeProductChannelSelection({
      channelTargets: ['website', 'x'],
      channels: { publishInstagram: false, publishFacebook: true },
    }),
    {
      channelTargets: ['website', 'x', 'facebook'],
      channels: {
        publishInstagram: false,
        publishFacebook: true,
        publishWebsite: true,
        publishShopier: false,
        publishX: true,
      },
    },
  )
})

check('true publish flags are copied back into channelTargets', () => {
  assert.deepStrictEqual(
    normalizeProductChannelSelection({
      channelTargets: ['website'],
      channels: { publishInstagram: true, publishX: true },
    }).channelTargets,
    ['website', 'instagram', 'x'],
  )
})

check('fresh products default to website only', () => {
  assert.deepStrictEqual(
    normalizeProductChannelSelection({}),
    {
      channelTargets: ['website'],
      channels: {
        publishWebsite: true,
        publishInstagram: false,
        publishShopier: false,
        publishX: false,
        publishFacebook: false,
      },
    },
  )
})

check('explicitly empty channel selection stays empty', () => {
  assert.deepStrictEqual(
    normalizeProductChannelSelection({
      channelTargets: [],
      channels: {
        publishWebsite: false,
        publishInstagram: false,
        publishShopier: false,
        publishX: false,
        publishFacebook: false,
      },
    }),
    {
      channelTargets: [],
      channels: {
        publishWebsite: false,
        publishInstagram: false,
        publishShopier: false,
        publishX: false,
        publishFacebook: false,
      },
    },
  )
})

check('detects unsupported targets and target/flag drift', () => {
  const issues = findProductChannelSelectionIssues({
    channelTargets: ['website', 'instagram', 'threads'],
    channels: {
      publishWebsite: true,
      publishInstagram: false,
      publishShopier: true,
    },
  })

  assert.deepStrictEqual(
    issues.map((issue) => issue.kind),
    ['unsupported_target', 'target_without_flag', 'flag_without_target'],
  )
  assert.ok(issues.some((issue) => issue.detail.includes('threads')), JSON.stringify(issues))
  assert.ok(issues.some((issue) => issue.detail.includes('publishInstagram')), JSON.stringify(issues))
  assert.ok(issues.some((issue) => issue.detail.includes('publishShopier')), JSON.stringify(issues))
})

console.log(`\nproductChannels: ${passed} checks passed${process.exitCode ? ' - WITH FAILURES' : ' - ALL OK'}`)
