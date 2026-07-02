/**
 * storefront-trust-governance.ts — pre-traffic hardening assertion.
 *
 * Pins two storefront trust guarantees as repo-text checks (same pattern as
 * retired-channel-governance.ts): the storefront must never ship fake reviews
 * or coming-soon review placeholders to production.
 *
 *   1. DEMO_REVIEWS_ENABLED stays hard-false in UygunApp.jsx (D-313).
 *   2. The old placeholder copy ("Gerçek müşteri yorumları onaylı şekilde
 *      burada yayınlanacak") stays removed (click-audit fix, 543939f).
 *
 * Pure file-content assertions — no network, no DB, no build.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const APP_FILE = join(process.cwd(), 'src', 'app', '(app)', 'UygunApp.jsx')

let passed = 0
let failed = 0

function check(name: string, ok: boolean, detail?: string) {
  if (ok) {
    passed++
    console.log(`  ok - ${name}`)
  } else {
    failed++
    console.error(`  fail - ${name}${detail ? `\n    ${detail}` : ''}`)
  }
}

const src = readFileSync(APP_FILE, 'utf8')

check(
  'DEMO_REVIEWS_ENABLED is pinned to false (no fake review cards in production)',
  /const\s+DEMO_REVIEWS_ENABLED\s*=\s*false/.test(src),
  'Expected `const DEMO_REVIEWS_ENABLED = false` in src/app/(app)/UygunApp.jsx — demo cards must stay off for production.',
)

check(
  'placeholder review copy stays removed from the storefront',
  !src.includes('Gerçek müşteri yorumları onaylı şekilde burada yayınlanacak'),
  'The coming-soon review placeholder returned — production must not show placeholder testimonials.',
)

check(
  'honest trust section is present (Neden UygunAyakkabı?)',
  src.includes('Neden UygunAyakkabı?'),
  'The trust section heading is missing — the social-proof slot must render real trust content, not a gap.',
)

console.log(
  `\nstorefront-trust: ${passed} checks passed, ${failed} failed${failed ? ' - WITH FAILURES' : ' - ALL OK'}`,
)
if (failed > 0) process.exit(1)
