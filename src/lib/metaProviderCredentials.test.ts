import assert from 'node:assert'
import { resolveMetaProviderCredentials } from './metaProviderCredentials'

let passed = 0

function check(name: string, fn: () => void) {
  try {
    fn()
    passed++
    console.log(`  ok - ${name}`)
  } catch (error) {
    console.error(`  fail - ${name}\n    ${(error as Error).message}`)
    process.exitCode = 1
  }
}

check('uses the deployment Facebook Page ID when the schema has no stored field', () => {
  const credentials = resolveMetaProviderCredentials({
    instagramTokens: { accessToken: ' meta-token ', userId: ' ig-user ' },
  }, { INSTAGRAM_PAGE_ID: ' fb-page ' })

  assert.deepStrictEqual(credentials, {
    accessToken: 'meta-token',
    instagramUserId: 'ig-user',
    facebookPageId: 'fb-page',
  })
})

check('keeps a legacy snapshot Page ID compatible when present', () => {
  const credentials = resolveMetaProviderCredentials({
    instagramTokens: { facebookPageId: 'legacy-page' },
  }, { INSTAGRAM_PAGE_ID: 'env-page' })

  assert.strictEqual(credentials.facebookPageId, 'legacy-page')
})

check('does not expose a missing Page ID as an empty string', () => {
  const credentials = resolveMetaProviderCredentials({
    instagramTokens: { facebookPageId: '   ' },
  }, {})

  assert.strictEqual(credentials.facebookPageId, null)
})

console.log(`\nmetaProviderCredentials: ${passed} checks passed${process.exitCode ? ' - WITH FAILURES' : ' - ALL OK'}`)
