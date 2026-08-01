import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

import { GENERATED_SCENES, GENERATED_SLOT_KEYS } from './imageSlotContract'
import {
  buildProductIdentityAnchorV0,
  buildOptionalVisualLockV0PromptBlock,
  buildVisualLockV0PromptFixture,
  LOAFER_IDENTITY_LOCK_V0_VERSION,
  parseVisualLockV0Command,
  PRODUCT_IDENTITY_ANCHOR_V0_VERSION,
  resolveVisualLockV0TaskSelection,
  VISUAL_FRAMING_LOCK_V0_VERSION,
  VISUAL_LOCK_V0_PROFILE_VERSION,
} from './imageVisualLockV0'

let passed = 0

function check(name: string, fn: () => void): void {
  try {
    fn()
    passed += 1
    console.log(`PASS ${name}`)
  } catch (error) {
    console.error(`FAIL ${name}`)
    console.error(error)
    process.exitCode = 1
  }
}

const loaferEvidence = {
  productClass: 'closed-back slip-on',
  mainColor: 'charcoal',
  accentColor: 'off-white',
  material: 'matte suede-like upper',
  toeShape: 'soft square-round toe',
  soleProfile: 'low flat sole',
  heelProfile: 'closed low heel',
  closureType: 'slip-on',
  distinctiveFeatures: 'continuous apron seam',
  constructionNotes: 'continuous apron seam with tonal stitching',
  visualNotes: 'low oval opening; no visible metal',
  colorAccents: ['off-white sole'],
}

const loaferFacts =
  'vamp proportions: long low vamp; opening shape: low oval opening; hardware: absent; ' +
  'ornament: stitched same-material motif; laces and eyelets: absent'

const genericEvidence = {
  productClass: 'mesh slip-on sneaker',
  mainColor: 'light grey',
  material: 'matte mesh upper',
  toeShape: 'rounded toe',
  soleProfile: 'sculpted white sole',
  heelProfile: 'closed heel with source-supported pull tab',
  closureType: 'elastic slip-on',
  distinctiveFeatures: 'curved side overlay and toe cap',
  visualNotes: 'no visible metal',
}

const loaferContext = buildProductIdentityAnchorV0({
  family: 'loafer',
  identityEvidence: loaferEvidence,
  operatorVisualFacts: loaferFacts,
})
const loaferPrompts = buildVisualLockV0PromptFixture(loaferContext)
const genericContext = buildProductIdentityAnchorV0({ family: 'generic', identityEvidence: genericEvidence })
const genericPrompts = buildVisualLockV0PromptFixture(genericContext)

check('1 default prompt digest remains unchanged', () => {
  const digest = createHash('sha256')
    .update(JSON.stringify(GENERATED_SCENES.map((scene) => scene.sceneInstructions)))
    .digest('hex')
  assert.equal(digest, '4050a83f01eae0c200b013ce9fc744b41890f49180cb1af0e2173e2a38adb810')
})

check('2 ordinary gorsel command remains on the default path', () => {
  assert.deepEqual(parseVisualLockV0Command({
    text: '#gorsel 101',
    chatType: 'private',
    botRole: 'uygunops',
    dmAccessReason: 'allowlisted',
  }), { kind: 'default' })
  assert.equal(buildOptionalVisualLockV0PromptBlock(undefined, 'side'), '')
})

check('3 Visual Lock V0 requires an allowlisted private Uygunops DM', () => {
  const accepted = parseVisualLockV0Command({
    text: '#gorsel 101 --profile=visual-lock-v0 --family=loafer',
    chatType: 'private',
    botRole: 'uygunops',
    dmAccessReason: 'allowlisted',
  })
  assert.equal(accepted.kind, 'accepted')
  assert.deepEqual(resolveVisualLockV0TaskSelection({ qualityProfile: 'visual-lock-v0', productFamily: 'loafer' }), {
    profile: 'visual-lock-v0',
    family: 'loafer',
  })
  assert.equal(parseVisualLockV0Command({
    text: '#gorsel 101 --profile=visual-lock-v0 --family=loafer',
    chatType: 'private',
    botRole: 'uygunops',
    dmAccessReason: 'open-allowlist',
  }).kind, 'rejected')
  assert.deepEqual(parseVisualLockV0Command({
    text: '#gorsel 101 --profile=visual-lock-v0 --family=loafer',
    chatType: 'private',
    botRole: 'geo',
    dmAccessReason: 'allowlisted',
  }), { kind: 'rejected', reason: 'uygunops-required' })
})

check('4 V0 is rejected in group and supergroup', () => {
  for (const chatType of ['group', 'supergroup']) {
    assert.deepEqual(parseVisualLockV0Command({
      text: '#gorsel 101 --profile=visual-lock-v0 --family=generic',
      chatType,
      botRole: 'uygunops',
      dmAccessReason: 'allowlisted',
    }), { kind: 'rejected', reason: 'private-chat-required' })
  }
})

check('5 mention-prefixed V0 command is rejected', () => {
  assert.deepEqual(parseVisualLockV0Command({
    text: '@Uygunops_bot #gorsel 101 --profile=visual-lock-v0 --family=generic',
    chatType: 'private',
    botRole: 'uygunops',
    dmAccessReason: 'allowlisted',
  }), { kind: 'rejected', reason: 'mention-prefix-forbidden' })
})

check('6 unknown profile is rejected', () => {
  assert.deepEqual(parseVisualLockV0Command({
    text: '#gorsel 101 --profile=future-profile --family=generic',
    chatType: 'private',
    botRole: 'uygunops',
    dmAccessReason: 'allowlisted',
  }), { kind: 'rejected', reason: 'unknown-profile' })
})

check('7 unknown family is rejected', () => {
  assert.deepEqual(parseVisualLockV0Command({
    text: '#gorsel 101 --profile=visual-lock-v0 --family=boot',
    chatType: 'private',
    botRole: 'uygunops',
    dmAccessReason: 'allowlisted',
  }), { kind: 'rejected', reason: 'unknown-family' })
})

check('8 all five prompts contain the identical identity-anchor hash and serialization', () => {
  assert.equal(loaferPrompts.length, 5)
  for (const prompt of loaferPrompts) {
    assert.ok(prompt.includes(loaferContext.identityAnchorHash))
    assert.ok(prompt.includes(loaferContext.serializedIdentityAnchor))
  }
})

check('9 all five prompts contain the cross-slot invariant', () => {
  for (const prompt of loaferPrompts) {
    assert.match(prompt, /exact same physical shoe in all five slots/i)
    assert.match(prompt, /Only the camera\/presentation purpose may change/i)
    assert.match(prompt, /coherent product-photography pack/i)
  }
})

check('10 all five prompts contain occupancy and centering contracts', () => {
  for (const prompt of loaferPrompts) {
    assert.match(prompt, /72-82%/)
    assert.match(prompt, /within 3% of the canvas center/)
    assert.match(prompt, /no cut-off toe, heel, or sole/i)
  }
})

check('11 every slot receives its exact orientation authority', () => {
  const markers = ['true controlled side/lateral', 'controlled hero three-quarter', 'controlled top/overhead', 'true rear, heel-centered', 'source-supported detail']
  loaferPrompts.forEach((prompt, index) => assert.match(prompt, new RegExp(markers[index], 'i')))
})

check('12 back explicitly forbids rear-three-quarter substitution', () => {
  const backIndex = GENERATED_SLOT_KEYS.indexOf('back')
  assert.match(loaferPrompts[backIndex], /Rear-three-quarter substitution is explicitly forbidden/i)
})

check('13 loafer profile includes all identity invariants', () => {
  const prompt = loaferPrompts[0]
  for (const invariant of ['toe width', 'vamp length', 'opening shape', 'apron seam path', 'heel counter', 'sole thickness', 'seam/stitching']) {
    assert.match(prompt, new RegExp(invariant, 'i'))
  }
})

check('14 loafer profile forbids family conversion', () => {
  const prompt = loaferPrompts[0]
  for (const forbidden of ['mule', 'slipper', 'generic moccasin', 'Oxford/Derby', 'lace-up shoe', 'sandal', 'sneaker']) {
    assert.match(prompt, new RegExp(forbidden, 'i'))
  }
})

check('15 loafer profile forbids invented hardware and topology', () => {
  assert.match(loaferPrompts[0], /Do not add tassels, penny straps, buckles, metal pieces, laces, eyelets, or pull tabs/i)
  assert.match(loaferPrompts[0], /hardwarePresence":"absent"/)
})

check('16 generic profile contains no loafer-specific assumptions', () => {
  for (const prompt of genericPrompts) {
    assert.doesNotMatch(prompt, /LOAFER IDENTITY LOCK/)
    assert.doesNotMatch(prompt, /penny straps|generic moccasin|Oxford\/Derby/)
  }
})

check('17 unknown facts remain explicit unknowns', () => {
  assert.equal(genericContext.identityAnchor.facts.vampUpperProportions, 'unknown')
  assert.equal(genericContext.identityAnchor.facts.openingShape, 'unknown')
  assert.equal(genericContext.identityAnchor.facts.hardwarePresence, 'unknown')
  assert.match(genericPrompts[0], /Unknown facts remain unknown/i)
})

check('18 D-355M material evidence remains present', () => {
  assert.equal(loaferContext.identityAnchor.sourceEvidence.materialFactLock, 'D-355M')
  assert.match(loaferContext.serializedIdentityAnchor, /matte suede-like upper/)
})

check('19 D-355N operator visual facts remain present', () => {
  assert.equal(loaferContext.identityAnchor.sourceEvidence.visualFactLock, 'D-355N')
  assert.match(loaferContext.serializedIdentityAnchor, /long low vamp/)
})

check('20 provider, slot count, retries, transforms, and default scene registry remain unchanged', () => {
  const task = readFileSync(new URL('../jobs/imageGenTask.ts', import.meta.url), 'utf8')
  assert.equal(GENERATED_SLOT_KEYS.length, 5)
  assert.match(task, /retries: 0/)
  assert.match(task, /input\.provider \|\| 'gemini-pro'/)
  assert.match(task, /normalizeProductCentering/)
  assert.match(task, /normalizeBackground/)
  assert.match(task, /overlayStockNumber/)
})

check('21 no collection schema field was added', () => {
  const collection = readFileSync(new URL('../collections/ImageGenerationJobs.ts', import.meta.url), 'utf8')
  assert.doesNotMatch(collection, /name:\s*['"]qualityProfile['"]/)
  assert.doesNotMatch(collection, /name:\s*['"]productFamily['"]/)
})

check('22 Visual Lock adds no provider, fetch, validation, or extraction call', () => {
  const moduleSource = readFileSync(new URL('./imageVisualLockV0.ts', import.meta.url), 'utf8')
  assert.doesNotMatch(moduleSource, /\bfetch\s*\(/)
  assert.doesNotMatch(moduleSource, /validateProductImage|extractIdentityLock|generateByGeminiPro|generateByEditing/)
})

check('23 profile, family, versions, and anchor hash persist in existing task and job metadata', () => {
  const task = readFileSync(new URL('../jobs/imageGenTask.ts', import.meta.url), 'utf8')
  const route = readFileSync(new URL('../app/api/telegram/route.ts', import.meta.url), 'utf8')
  assert.match(task, /qualityProfile: visualLockSelection\?\.profile/)
  assert.match(task, /productFamily: visualLockContext\.family/)
  assert.match(task, /identityAnchorHash: visualLockContext\.identityAnchorHash/)
  assert.match(route, /qualityProfile: visualLockCommand\.qualityProfile/)
  assert.match(route, /productFamily: visualLockCommand\.family/)
  assert.doesNotMatch(route, /serializedIdentityAnchor|IDENTITY ANCHOR \(canonical JSON/)
})

check('24 prompt output and the pinned V0 fixture digest are deterministic', () => {
  const rebuilt = buildProductIdentityAnchorV0({
    family: 'loafer',
    identityEvidence: { ...loaferEvidence, colorAccents: [...loaferEvidence.colorAccents] },
    operatorVisualFacts: loaferFacts,
  })
  assert.equal(rebuilt.serializedIdentityAnchor, loaferContext.serializedIdentityAnchor)
  assert.equal(rebuilt.identityAnchorHash, '93ce6234897bd89b141d8c8683de7d1882dc7ee2cdd2048f4735f8b8b7826b36')
  const digest = createHash('sha256').update(JSON.stringify(buildVisualLockV0PromptFixture(rebuilt))).digest('hex')
  assert.equal(digest, 'f6d25f7e4980c731c9e191bd6bfd7f9ee3ae104ac927f67bdb64ac77ae00238d')
  assert.equal(VISUAL_LOCK_V0_PROFILE_VERSION, 'visual-lock/v0')
  assert.equal(PRODUCT_IDENTITY_ANCHOR_V0_VERSION, 'product-identity-anchor/v0')
  assert.equal(LOAFER_IDENTITY_LOCK_V0_VERSION, 'loafer-identity-lock/v0')
  assert.equal(VISUAL_FRAMING_LOCK_V0_VERSION, 'visual-framing-lock/v0')
})

console.log(`\nimageVisualLockV0: ${passed} checks passed${process.exitCode ? ' — WITH FAILURES' : ' — ALL OK'}`)
