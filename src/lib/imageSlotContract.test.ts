import assert from 'node:assert'
import {
  GENERATED_SLOTS,
  GENERATED_SLOT_KEYS,
  GENERATED_SCENES,
  SLOT_PROMPT_VERSION,
  CENTERING_FRAMING_BLOCK,
  buildSlotMeta,
  buildSlotSceneInstructions,
  getSlotByIndex,
  getSlotByKey,
  frameCoverageForIndex,
  slotLayoutForIndex,
  isValidSlotKey,
  orderBySlot,
  validateSlotContract,
  assertSlotContract,
} from './imageSlotContract'

let passed = 0

function check(name: string, fn: () => void): void {
  try {
    fn()
    passed += 1
    console.log(`  ok - ${name}`)
  } catch (e) {
    console.error(`  fail - ${name}\n    ${(e as Error).message}`)
    process.exitCode = 1
  }
}

// ── 1. Exactly 5 slots ──────────────────────────────────────────────────────
check('there are exactly 5 slots and 5 keys', () => {
  assert.strictEqual(GENERATED_SLOTS.length, 5)
  assert.strictEqual(GENERATED_SLOT_KEYS.length, 5)
  assert.strictEqual(GENERATED_SCENES.length, 5)
})

// ── 2. Fixed slot types + canonical order (deterministic) ────────────────────
check('slot keys match the canonical contract in the exact fixed order', () => {
  assert.deepStrictEqual(
    [...GENERATED_SLOT_KEYS],
    ['hero_3q', 'side', 'top', 'back', 'detail'],
  )
})

check('slot index === position for every slot (deterministic order)', () => {
  GENERATED_SLOTS.forEach((slot, i) => {
    assert.strictEqual(slot.index, i, `slot ${slot.key} index drift`)
    assert.strictEqual(slot.key, GENERATED_SLOT_KEYS[i], `slot order drift at ${i}`)
  })
})

check('GENERATED_SCENES mirror the slots 1:1 in order', () => {
  GENERATED_SCENES.forEach((scene, i) => {
    assert.strictEqual(scene.name, GENERATED_SLOT_KEYS[i])
    assert.strictEqual(scene.label, GENERATED_SLOTS[i].label)
  })
})

// ── 3. Valid, unique slot keys only ─────────────────────────────────────────
check('slot keys are unique and valid', () => {
  const seen = new Set<string>()
  for (const key of GENERATED_SLOT_KEYS) {
    assert.ok(isValidSlotKey(key), `key ${key} should be valid`)
    assert.ok(!seen.has(key), `duplicate key ${key}`)
    seen.add(key)
  }
  assert.strictEqual(isValidSlotKey('side_angle'), false) // old key retired
  assert.strictEqual(isValidSlotKey('front'), false)      // D-410: dead-on front retired for 3/4 hero
  assert.strictEqual(isValidSlotKey('nonsense'), false)
})

// ── 4. Centering / framing rule present in every slot prompt template ────────
check('every slot prompt contains the centering/framing discipline', () => {
  for (const scene of GENERATED_SCENES) {
    assert.ok(
      scene.sceneInstructions.includes('FRAMING & CENTERING DISCIPLINE'),
      `slot ${scene.name} missing centering block`,
    )
    assert.ok(/centered/i.test(scene.sceneInstructions), `slot ${scene.name} missing 'centered'`)
    // placeholders the pipeline resolves must be present
    assert.ok(scene.sceneInstructions.includes('{COLOR}'), `slot ${scene.name} missing {COLOR}`)
    assert.ok(scene.sceneInstructions.includes('{BACKGROUND}'), `slot ${scene.name} missing {BACKGROUND}`)
  }
})

check('the shared centering block forbids drift and pins consistent scale', () => {
  assert.ok(/MUST NOT drift/i.test(CENTERING_FRAMING_BLOCK))
  assert.ok(/consistent visual scale/i.test(CENTERING_FRAMING_BLOCK))
})

check('slots do NOT hardcode strict camera geometry (no degree values)', () => {
  // Operator rule D-407: the model chooses composition; scenes must be geometry-free.
  for (const scene of GENERATED_SCENES) {
    assert.ok(!/\d+\s*°/.test(scene.sceneInstructions), `slot ${scene.name} hardcodes a degree value`)
    assert.ok(!/\d+\s*cm/.test(scene.sceneInstructions), `slot ${scene.name} hardcodes a distance`)
  }
})

// ── 5. Prompt version present + stamped into metadata ────────────────────────
check('a non-empty prompt version is set', () => {
  assert.ok(SLOT_PROMPT_VERSION && SLOT_PROMPT_VERSION.trim().length > 0)
})

check('buildSlotMeta stamps slotIndex/slotKey/promptVersion/productId/sourceImageId', () => {
  const meta = buildSlotMeta({ slotIndex: 3, productId: 359, sourceImageId: 12, mediaId: 99 })
  assert.strictEqual(meta.slotIndex, 3)
  assert.strictEqual(meta.slotKey, 'back')
  assert.strictEqual(meta.promptVersion, SLOT_PROMPT_VERSION)
  assert.strictEqual(meta.productId, 359)
  assert.strictEqual(meta.sourceImageId, 12)
  assert.strictEqual(meta.mediaId, 99)
})

check('buildSlotMeta degrades safely for an out-of-range slot index', () => {
  const meta = buildSlotMeta({ slotIndex: 9, productId: 1, sourceImageId: null })
  assert.strictEqual(meta.slotKey, 'unknown_9')
  assert.strictEqual(meta.mediaId, null)
})

// ── Lookup + ordering helpers ───────────────────────────────────────────────
check('getSlotByIndex / getSlotByKey resolve the canonical slots', () => {
  assert.strictEqual(getSlotByIndex(0)?.key, 'hero_3q')
  assert.strictEqual(getSlotByIndex(4)?.key, 'detail')
  assert.strictEqual(getSlotByKey('top')?.index, 2)
  assert.strictEqual(getSlotByIndex(5), undefined)
})

check('orderBySlot restores the fixed slot order from a shuffled set', () => {
  const shuffled = [
    { slotKey: 'detail', id: 5 },
    { slotKey: 'hero_3q', id: 1 },
    { slotKey: 'back', id: 4 },
    { slotKey: 'side', id: 2 },
    { slotKey: 'top', id: 3 },
  ]
  const ordered = orderBySlot(shuffled, (x) => x.slotKey)
  assert.deepStrictEqual(ordered.map((x) => x.id), [1, 2, 3, 4, 5])
})

check('orderBySlot keeps unknown-slot items after known ones (stable)', () => {
  const items = [
    { slotKey: 'weird', id: 9 },
    { slotKey: 'side', id: 2 },
    { slotKey: 'hero_3q', id: 1 },
  ]
  const ordered = orderBySlot(items, (x) => x.slotKey)
  assert.deepStrictEqual(ordered.map((x) => x.id), [1, 2, 9])
})

check('buildSlotSceneInstructions names the slot and stays reference-safe', () => {
  const scene = buildSlotSceneInstructions(GENERATED_SLOTS[2]) // top
  assert.ok(scene.includes('TOP'))
  assert.ok(/do NOT invent/i.test(scene))
})

// ── The contract self-validates ─────────────────────────────────────────────
check('every slot carries a valid centering coverage (0..1] — D-408 lock', () => {
  for (const slot of GENERATED_SLOTS) {
    assert.ok(slot.frameCoverage > 0 && slot.frameCoverage <= 1, `${slot.key} coverage ${slot.frameCoverage}`)
  }
  // full-shoe slots share one scale; the tight detail fills more of the frame
  assert.strictEqual(getSlotByKey('hero_3q')!.frameCoverage, getSlotByKey('back')!.frameCoverage)
  assert.ok(getSlotByKey('detail')!.frameCoverage > getSlotByKey('hero_3q')!.frameCoverage)
  assert.strictEqual(frameCoverageForIndex(0), getSlotByKey('hero_3q')!.frameCoverage)
  assert.strictEqual(frameCoverageForIndex(99), 0.82) // safe fallback
})

check('exactly hero_3q + top are pair slots; the rest are single — D-416', () => {
  const pairs = GENERATED_SLOTS.filter((s) => s.layout === 'pair').map((s) => s.key)
  assert.deepStrictEqual(pairs.sort(), ['hero_3q', 'top'])
  assert.strictEqual(slotLayoutForIndex(0), 'pair')  // hero_3q
  assert.strictEqual(slotLayoutForIndex(2), 'pair')  // top
  assert.strictEqual(slotLayoutForIndex(1), 'single') // side
  assert.strictEqual(slotLayoutForIndex(3), 'single') // back
  assert.strictEqual(slotLayoutForIndex(4), 'single') // detail
  assert.strictEqual(slotLayoutForIndex(99), 'single') // safe fallback
  for (const s of GENERATED_SLOTS) assert.ok(s.layout === 'single' || s.layout === 'pair')
})

check('validateSlotContract() reports the contract as valid', () => {
  const { ok, errors } = validateSlotContract()
  assert.ok(ok, `contract invalid: ${errors.join('; ')}`)
  assert.strictEqual(errors.length, 0)
})

check('assertSlotContract() does not throw', () => {
  assert.doesNotThrow(() => assertSlotContract())
})

console.log(`\nimageSlotContract: ${passed} checks passed${process.exitCode ? ' - WITH FAILURES' : ' - ALL OK'}`)
