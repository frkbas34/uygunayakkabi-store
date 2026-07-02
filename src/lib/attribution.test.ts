import assert from 'node:assert'

// ── Minimal browser stubs (deterministic — no DOM library, no network) ──────
// attribution.ts is client-only and guards on typeof window; these stubs give
// it a working sessionStorage + location + referrer so first-touch behavior
// can be exercised exactly like a homepage→PDP navigation.

type Loc = { search: string; pathname: string; hostname: string }

function makeStubWindow(loc: Loc) {
  const store = new Map<string, string>()
  const win = {
    location: loc,
    sessionStorage: {
      getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
      setItem: (k: string, v: string) => void store.set(k, String(v)),
      removeItem: (k: string) => void store.delete(k),
    },
  }
  return { win, store }
}

function setBrowser(loc: Loc, referrer = '') {
  const { win } = makeStubWindow(loc)
  ;(globalThis as Record<string, unknown>).window = win
  ;(globalThis as Record<string, unknown>).document = { referrer }
  return win
}

function navigate(loc: Loc, referrer = '') {
  // keep the SAME sessionStorage across navigations (same tab), change URL
  const w = (globalThis as Record<string, unknown>).window as ReturnType<typeof makeStubWindow>['win']
  ;(globalThis as Record<string, unknown>).window = { ...w, location: loc }
  ;(globalThis as Record<string, unknown>).document = { referrer }
}

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

async function main() {
  // Import AFTER stubs exist so module-level guards see a browser-like world.
  const { captureFirstTouch, getStoredAttribution, resolveSubmitAttribution } = await import('./attribution')

  check('first-touch UTM captured at landing survives homepage → PDP navigation', () => {
    setBrowser({ search: '?utm_source=Google&utm_medium=CPC&utm_campaign=Yaz_Kampanya', pathname: '/', hostname: 'uygunayakkabi.com' })
    captureFirstTouch()
    // SPA/SSR navigation drops the query string:
    navigate({ search: '', pathname: '/products/suet-loafer', hostname: 'uygunayakkabi.com' })
    captureFirstTouch() // idempotent — must NOT overwrite or clear
    const stored = getStoredAttribution()
    assert.strictEqual(stored.utmSource, 'google') // lowercased by clean()
    assert.strictEqual(stored.utmMedium, 'cpc')
    assert.strictEqual(stored.utmCampaign, 'yaz_kampanya')
    assert.strictEqual(stored.landing, '/') // first-touch entry path, not the PDP
  })

  check('a later UTM landing cannot overwrite the first touch (first-touch wins)', () => {
    setBrowser({ search: '?utm_source=meta&utm_medium=paid', pathname: '/', hostname: 'uygunayakkabi.com' })
    captureFirstTouch()
    navigate({ search: '?utm_source=tiktok', pathname: '/ayakkabilar', hostname: 'uygunayakkabi.com' })
    captureFirstTouch()
    assert.strictEqual(getStoredAttribution().utmSource, 'meta')
  })

  check('no-signal landing stores nothing, leaving the slot open for a later UTM hit', () => {
    setBrowser({ search: '', pathname: '/', hostname: 'uygunayakkabi.com' })
    captureFirstTouch()
    assert.deepStrictEqual(getStoredAttribution(), {})
    navigate({ search: '?utm_source=google', pathname: '/', hostname: 'uygunayakkabi.com' })
    captureFirstTouch()
    assert.strictEqual(getStoredAttribution().utmSource, 'google')
  })

  check('external referrer is captured as hostname only; same-host referrer ignored', () => {
    setBrowser({ search: '', pathname: '/', hostname: 'uygunayakkabi.com' }, 'https://www.instagram.com/some/post?x=1')
    captureFirstTouch()
    assert.strictEqual(getStoredAttribution().referrer, 'www.instagram.com')

    setBrowser({ search: '', pathname: '/', hostname: 'uygunayakkabi.com' }, 'https://uygunayakkabi.com/ayakkabilar')
    captureFirstTouch()
    assert.deepStrictEqual(getStoredAttribution(), {})
  })

  check('submit merge: current-URL params win over stored first-touch', () => {
    const merged = resolveSubmitAttribution({
      currentUtm: { utmSource: 'google', utmMedium: null, utmCampaign: undefined },
      currentReferrer: null,
      stored: { utmSource: 'meta', utmMedium: 'paid', utmCampaign: 'yaz', referrer: 'l.instagram.com', landing: '/' },
      currentPath: '/products/suet-loafer',
    })
    assert.strictEqual(merged.utmSource, 'google') // current wins
    assert.strictEqual(merged.utmMedium, 'paid') // stored fills the gap
    assert.strictEqual(merged.utmCampaign, 'yaz')
    assert.strictEqual(merged.referrer, 'l.instagram.com')
    assert.strictEqual(merged.landing, '/') // first-touch landing preferred
  })

  check('submit merge: with no attribution anywhere, every field is null (never fake)', () => {
    const merged = resolveSubmitAttribution({ currentUtm: {}, stored: {}, currentPath: null })
    assert.deepStrictEqual(merged, { utmSource: null, utmMedium: null, utmCampaign: null, referrer: null, landing: null })
  })

  check('submit merge: landing falls back to the submitting page path when no first touch', () => {
    const merged = resolveSubmitAttribution({ currentUtm: {}, stored: {}, currentPath: '/products/erkek-siyah-loafer' })
    assert.strictEqual(merged.landing, '/products/erkek-siyah-loafer')
  })

  console.log(`\nattribution: ${passed} checks passed${process.exitCode ? ' - WITH FAILURES' : ' - ALL OK'}`)
}

void main()
