import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

import { GENERATED_SCENES, GENERATED_SLOT_KEYS, type SlotKey } from './imageSlotContract'
import { blockImageSlotEnvelopesForQualityGate, createImageGenerationAttempt } from './imageGenerationContracts'
import {
  buildVisualLockV01Context,
  buildVisualLockV01ComponentTopologyContractPrompt,
  buildVisualLockV01FailureWorkflow,
  buildVisualLockV01AngleContractPrompt,
  buildVisualLockV01MaterialContractPrompt,
  buildVisualLockV01PromptFixture,
  buildVisualLockV01StudioContractPrompt,
  buildVisualQualityEvaluatorPromptV01,
  buildVisualQualityGateSummaryV01,
  combineVisualQualityGateV01,
  COMPONENT_TOPOLOGY_LOCK_V01_VERSION,
  evaluateVisualGeometryMeasurementV01,
  evaluateVisualGeometryPackV01,
  normalizeVisualQualityProviderResponseV01 as normalizeVisualQualityProviderResponseWithContextV01,
  parseVisualLockCommand,
  parseVisualQualityEvaluatorV01 as parseVisualQualityEvaluatorWithContextV01,
  resolveVisualLockTaskSelection,
  VISUAL_GEOMETRY_GATE_V01_VERSION,
  VISUAL_LOCK_V01_ANGLE_CONTRACTS,
  VISUAL_LOCK_V01_ANGLE_CONTRACT_VERSION,
  VISUAL_LOCK_V01_COMPONENT_TOPOLOGY_CONTRACT,
  VISUAL_LOCK_V01_COMPONENT_TOPOLOGY_REASON_CODES,
  VISUAL_LOCK_V01_MATERIAL_CONTRACT,
  VISUAL_LOCK_V01_MATERIAL_CONTRACT_VERSION,
  VISUAL_LOCK_V01_PROFILE_VERSION,
  VISUAL_LOCK_V01_STUDIO_CONTRACT,
  VISUAL_LOCK_V01_STUDIO_CONTRACT_VERSION,
  VISUAL_QUALITY_EVALUATOR_V01_VERSION,
} from './imageVisualLockV01'
import { buildProductIdentityAnchorV0, buildVisualLockV0PromptFixture } from './imageVisualLockV0'

let passed = 0
function check(name: string, fn: () => void): void {
  try { fn(); passed++; console.log(`PASS ${name}`) }
  catch (error) { console.error(`FAIL ${name}`); console.error(error); process.exitCode = 1 }
}

const evidence = {
  productClass: 'mesh slip-on sneaker',
  mainColor: 'light grey',
  material: 'matte mesh upper',
  toeShape: 'rounded toe',
  soleProfile: 'sculpted white sole with repeated cavities',
  heelProfile: 'closed heel with source-supported pull tab',
  closureType: 'elastic slip-on',
  distinctiveFeatures: 'instep patch, curved side overlay, toe cap, pull tab',
  constructionNotes: 'curved overlay seam and visible instep patch boundary',
  visualNotes: 'instep patch and curved overlay are the only ornaments; no visible metal hardware, laces, or eyelets; repeated sole cavity rhythm',
}
const context = buildVisualLockV01Context({ family: 'generic', identityEvidence: evidence })
const parseVisualQualityEvaluatorV01 = (raw: string, slotId: SlotKey) =>
  parseVisualQualityEvaluatorWithContextV01(raw, slotId, context)
const normalizeVisualQualityProviderResponseV01 = (response: unknown, slotId: SlotKey) =>
  normalizeVisualQualityProviderResponseWithContextV01(response, slotId, context)
const completeEvaluatorPayload = {
  color: { state: 'pass', detectedColor: 'light grey', evidence: 'light grey mesh upper is visible' },
  topology: { state: 'pass', reasonCodes: [], evidence: 'instep patch and curved side overlay are retained' },
  orientation: { state: 'pass', detectedView: 'true_rear', evidence: 'heel is shown straight-on and symmetrically' },
  studio: { state: 'pass', evidence: 'uniform warm-neutral studio and subtle contact shadow' },
  material: { state: 'pass', reasonCodes: [], evidence: 'matte mesh material zones and boundaries are preserved' },
}

check('1 default and V0 prompt digests remain unchanged', () => {
  const defaultDigest = createHash('sha256').update(JSON.stringify(GENERATED_SCENES.map((scene) => scene.sceneInstructions))).digest('hex')
  assert.equal(defaultDigest, '4050a83f01eae0c200b013ce9fc744b41890f49180cb1af0e2173e2a38adb810')
  const v0 = buildProductIdentityAnchorV0({ family: 'generic', identityEvidence: evidence })
  const before = createHash('sha256').update(JSON.stringify(buildVisualLockV0PromptFixture(v0))).digest('hex')
  const rebuilt = createHash('sha256').update(JSON.stringify(buildVisualLockV0PromptFixture(buildProductIdentityAnchorV0({ family: 'generic', identityEvidence: evidence })))).digest('hex')
  assert.equal(rebuilt, before)
})

check('2 V0.1 is a separate allowlisted private-DM selector', () => {
  assert.deepEqual(parseVisualLockCommand({ text: '#gorsel 101 --profile=visual-lock-v0.1 --family=generic', chatType: 'private', botRole: 'uygunops', dmAccessReason: 'allowlisted' }), {
    kind: 'accepted', productId: 101, qualityProfile: 'visual-lock-v0.1', profileVersion: 'visual-lock/v0.1', family: 'generic',
  })
  assert.equal(parseVisualLockCommand({ text: '#gorsel 101', chatType: 'private', botRole: 'uygunops', dmAccessReason: 'allowlisted' }).kind, 'default')
  assert.deepEqual(resolveVisualLockTaskSelection({ qualityProfile: 'visual-lock-v0.1', productFamily: 'generic' }), {
    profile: 'visual-lock-v0.1', profileVersion: 'visual-lock/v0.1', family: 'generic',
  })
})

check('3 V0.1 rejects group, mention, open allowlist, unknown family, and malformed syntax', () => {
  const base = { text: '#gorsel 101 --profile=visual-lock-v0.1 --family=generic', botRole: 'uygunops' as const, dmAccessReason: 'allowlisted' as const }
  assert.equal(parseVisualLockCommand({ ...base, chatType: 'group' }).kind, 'rejected')
  assert.equal(parseVisualLockCommand({ ...base, text: '@Uygunops_bot ' + base.text, chatType: 'private' }).kind, 'rejected')
  assert.equal(parseVisualLockCommand({ ...base, chatType: 'private', dmAccessReason: 'open-allowlist' }).kind, 'rejected')
  assert.equal(parseVisualLockCommand({ ...base, text: '#gorsel 101 --profile=visual-lock-v0.1 --family=boot', chatType: 'private' }).kind, 'rejected')
  assert.equal(parseVisualLockCommand({ ...base, text: '#gorsel 101 --family=generic --profile=visual-lock-v0.1', chatType: 'private' }).kind, 'rejected')
})

check('4 V0 remains independently selectable and versioned', () => {
  const decision = parseVisualLockCommand({ text: '#gorsel 101 --profile=visual-lock-v0 --family=loafer', chatType: 'private', botRole: 'uygunops', dmAccessReason: 'allowlisted' })
  assert.equal(decision.kind, 'accepted')
  if (decision.kind === 'accepted') assert.equal(decision.profileVersion, 'visual-lock/v0')
})

check('5 component topology is canonical and source-supported', () => {
  assert.equal(context.componentTopologyVersion, COMPONENT_TOPOLOGY_LOCK_V01_VERSION)
  assert.match(context.serializedComponentTopology, /instep patch, curved side overlay, toe cap, pull tab/)
  assert.match(context.serializedComponentTopology, /repeated sole cavity rhythm/)
  assert.match(context.componentTopology.sourceSupported.hardwarePresence, /no visible metal hardware/i)
  assert.match(context.componentTopology.sourceSupported.ornamentPresence, /instep patch/i)
  assert.match(context.componentTopology.sourceSupported.lacesAndEyelets, /laces, or eyelets/i)
  assert.equal(context.identityAnchor.sourceEvidence.operatorVisualFacts, 'unknown')
  assert.doesNotMatch(context.serializedComponentTopology, /preservationRule|uncertaintyRule/)
  assert.equal(context.componentTopologyHash.length, 64)
})

check('6 every V0.1 prompt carries all explicit contract versions and topology', () => {
  for (const prompt of buildVisualLockV01PromptFixture(context)) {
    assert.match(prompt, /visual-lock\/v0\.1/)
    assert.match(prompt, /component-topology-lock\/v0\.1/)
    assert.match(prompt, /visual-quality-evaluator\/v0\.1/)
    assert.match(prompt, /visual-geometry-gate\/v0\.1/)
    assert.match(prompt, /visual-angle-contract\/v1/)
    assert.match(prompt, /visual-studio-contract\/v1/)
    assert.match(prompt, /material-zone-fidelity-contract\/v1/)
    assert.ok(prompt.includes(context.componentTopologyHash))
  }
})

check('7 back prompt requires true rear and forbids rear-three-quarter', () => {
  assert.match(buildVisualLockV01PromptFixture(context)[3], /true-rear/i)
  assert.match(buildVisualLockV01PromptFixture(context)[3], /FORBIDDEN SUBSTITUTIONS: rear-three-quarter view/i)
})

check('7a canonical slot order is preserved and every slot has one distinct exact angle contract', () => {
  assert.deepEqual(GENERATED_SLOT_KEYS, ['side', 'hero_3q', 'top', 'back', 'detail'])
  assert.deepEqual(
    GENERATED_SLOT_KEYS.map((slotId) => VISUAL_LOCK_V01_ANGLE_CONTRACTS[slotId].semanticMeaning),
    ['side', 'hero_three_quarter', 'top', 'true_rear', 'material_detail'],
  )
  assert.equal(new Set(GENERATED_SLOT_KEYS.map(buildVisualLockV01AngleContractPrompt)).size, 5)
})

check('7b generation and evaluator prompts share the exact canonical slot contract', () => {
  for (const slotId of GENERATED_SLOT_KEYS) {
    const canonical = buildVisualLockV01AngleContractPrompt(slotId)
    assert.ok(buildVisualLockV01PromptFixture(context)[GENERATED_SLOT_KEYS.indexOf(slotId)].includes(canonical))
    assert.ok(buildVisualQualityEvaluatorPromptV01(context, slotId).includes(canonical))
  }
})

check('7c hero_3q cannot silently use side, front, top, or rear-three-quarter', () => {
  const contract = VISUAL_LOCK_V01_ANGLE_CONTRACTS.hero_3q
  assert.deepEqual(contract.azimuth, { targetDegrees: 40, toleranceDegrees: 5 })
  assert.deepEqual(contract.elevation, { targetDegrees: 12, toleranceDegrees: 3 })
  assert.match(buildVisualLockV01AngleContractPrompt('hero_3q'), /toe and outer side both clearly visible/i)
  for (const detectedView of ['side', 'front', 'top', 'rear_three_quarter']) {
    const result = parseVisualQualityEvaluatorV01(JSON.stringify({
      color: { state: 'pass', detectedColor: 'light grey', evidence: 'visible' },
      topology: { state: 'pass', reasonCodes: [], evidence: 'source topology retained' },
      orientation: { state: 'pass', detectedView, evidence: 'clearly visible semantic view' },
    }), 'hero_3q')
    assert.equal(result.orientation.state, 'fail')
  }
})

check('7d side, top, and back encode their exact numeric and visual angle boundaries', () => {
  assert.deepEqual(VISUAL_LOCK_V01_ANGLE_CONTRACTS.side.azimuth, { targetDegrees: 90, toleranceDegrees: 2 })
  assert.deepEqual(VISUAL_LOCK_V01_ANGLE_CONTRACTS.side.elevation, { targetDegrees: 0, toleranceDegrees: 2 })
  assert.match(buildVisualLockV01AngleContractPrompt('side'), /strict outer-side lateral profile/i)
  assert.match(buildVisualLockV01AngleContractPrompt('side'), /heel-to-toe baseline approximately horizontal/i)

  assert.equal(VISUAL_LOCK_V01_ANGLE_CONTRACTS.top.azimuth, null)
  assert.deepEqual(VISUAL_LOCK_V01_ANGLE_CONTRACTS.top.elevation, { targetDegrees: 90, toleranceDegrees: 2 })
  assert.match(buildVisualLockV01AngleContractPrompt('top'), /toe pointing toward 12 o'clock/i)
  assert.match(buildVisualLockV01AngleContractPrompt('top'), /top-oblique view/i)

  assert.deepEqual(VISUAL_LOCK_V01_ANGLE_CONTRACTS.back.azimuth, { targetDegrees: 180, toleranceDegrees: 2 })
  assert.deepEqual(VISUAL_LOCK_V01_ANGLE_CONTRACTS.back.elevation, { targetDegrees: 5, toleranceDegrees: 2 })
  assert.match(buildVisualLockV01AngleContractPrompt('back'), /left and right side visibility minimal and approximately symmetric/i)
  assert.match(buildVisualLockV01AngleContractPrompt('back'), /visible vamp/i)
})

check('7e detail keeps its durable slot ID but receives material_detail semantics and the only crop permission', () => {
  const detail = VISUAL_LOCK_V01_ANGLE_CONTRACTS.detail
  assert.equal(detail.slotId, 'detail')
  assert.equal(detail.semanticMeaning, 'material_detail')
  assert.equal(detail.expectedDetectedView, 'material_detail')
  assert.deepEqual(detail.azimuth, { targetDegrees: 40, toleranceDegrees: 5 })
  assert.deepEqual(detail.elevation, { targetDegrees: 25, toleranceDegrees: 5 })
  assert.deepEqual(GENERATED_SLOT_KEYS.filter((slotId) => VISUAL_LOCK_V01_ANGLE_CONTRACTS[slotId].intentionalCropAllowed), ['detail'])
  assert.ok(GENERATED_SLOT_KEYS.filter((slotId) => slotId !== 'detail').every((slotId) => VISUAL_LOCK_V01_ANGLE_CONTRACTS[slotId].entireShoeRequired))
  assert.match(buildVisualLockV01AngleContractPrompt('detail'), /detached material swatch/i)
  assert.match(buildVisualLockV01AngleContractPrompt('detail'), /never create a pair/i)
})

check('7f a clear angle failure is fail while incomplete or unsupported angle evidence is unknown', () => {
  const clearFailure = parseVisualQualityEvaluatorV01(JSON.stringify({
    color: { state: 'pass', detectedColor: 'light grey', evidence: 'visible' },
    topology: { state: 'pass', reasonCodes: [], evidence: 'source topology retained' },
    orientation: { state: 'fail', detectedView: 'side', evidence: 'strict lateral profile instead of hero three-quarter' },
  }), 'hero_3q')
  assert.equal(clearFailure.state, 'fail')
  assert.equal(clearFailure.orientation.state, 'fail')

  for (const raw of [
    '{}',
    '{bad',
    JSON.stringify({ color: completeEvaluatorPayload.color, topology: completeEvaluatorPayload.topology }),
    JSON.stringify({ ...completeEvaluatorPayload, orientation: { state: 'pass', detectedView: 'fish_eye', evidence: 'unsupported' } }),
  ]) {
    assert.equal(parseVisualQualityEvaluatorV01(raw, 'hero_3q').state, 'unknown')
  }
})

check('7g every generation prompt and evaluator share the canonical studio contract', () => {
  for (const slotId of GENERATED_SLOT_KEYS) {
    const canonical = buildVisualLockV01StudioContractPrompt(slotId)
    assert.ok(buildVisualLockV01PromptFixture(context)[GENERATED_SLOT_KEYS.indexOf(slotId)].includes(canonical))
    assert.ok(buildVisualQualityEvaluatorPromptV01(context, slotId).includes(canonical))
  }
})

check('7h studio background and lighting targets are exact and prohibit contamination', () => {
  const prompt = buildVisualLockV01StudioContractPrompt('side')
  assert.match(prompt, /square 1024 × 1024 catalog composition/i)
  assert.match(prompt, /uniform matte warm-neutral near-white/i)
  assert.match(prompt, /#F7F5F0/i)
  assert.match(prompt, /visual reference, not pixel-perfect equality/i)
  assert.match(prompt, /visible horizon or background seam/i)
  assert.match(prompt, /gradient, vignette, spotlight halo, or glow/i)
  assert.match(prompt, /texture, pattern, props, platform, pedestal, or decorative surface/i)
  assert.match(prompt, /reflection or glossy floor/i)
  assert.match(prompt, /text, logo, caption, watermark, or Sho118 contamination/i)
  assert.match(prompt, /large broad soft key light from upper-front-left/i)
  assert.match(prompt, /gentle soft fill from front-right/i)
  assert.match(prompt, /2:1 key-to-fill/i)
  assert.match(prompt, /5200K/i)
  assert.match(prompt, /5000–5400K/i)
  assert.match(prompt, /unclipped highlights/i)
  assert.match(prompt, /crushed shadow regions/i)
})

check('7i contact shadow is required for four full-product slots and optional only for material_detail', () => {
  for (const slotId of ['side', 'hero_3q', 'top', 'back'] as const) {
    const prompt = buildVisualLockV01StudioContractPrompt(slotId)
    assert.match(prompt, /CONTACT SHADOW REQUIRED/i)
    assert.match(prompt, /one subtle neutral-gray contact shadow/i)
    assert.match(prompt, /soft feathered edges/i)
    assert.doesNotMatch(prompt, /MATERIAL_DETAIL SHADOW EXCEPTION/i)
  }
  const detail = buildVisualLockV01StudioContractPrompt('detail')
  assert.match(detail, /MATERIAL_DETAIL SHADOW EXCEPTION/i)
  assert.match(detail, /contact shadow is not required and its absence must not fail/i)
  assert.doesNotMatch(detail, /CONTACT SHADOW REQUIRED/i)
  assert.match(detail, /#F7F5F0/i)
  assert.match(detail, /upper-front-left/i)
})

check('7j prohibited studio conditions fail and ambiguous studio evidence remains unknown', () => {
  const failure = parseVisualQualityEvaluatorV01(JSON.stringify({
    ...completeEvaluatorPayload,
    studio: { state: 'fail', evidence: 'visible gradient, watermark, and detached hard shadow' },
  }), 'back')
  assert.equal(failure.studio.state, 'fail')
  assert.equal(failure.state, 'fail')
  assert.ok(failure.reasonCodes.includes('studio_failed'))
  assert.equal(combineVisualQualityGateV01([failure.state], 'pass'), 'fail')

  const ambiguous = parseVisualQualityEvaluatorV01(JSON.stringify({
    ...completeEvaluatorPayload,
    studio: { state: 'unknown', evidence: 'background edge is not visible enough to verify' },
  }), 'back')
  assert.equal(ambiguous.studio.state, 'unknown')
  assert.equal(ambiguous.state, 'unknown')
  assert.equal(combineVisualQualityGateV01([ambiguous.state], 'pass'), 'unknown')

  const unsupported = parseVisualQualityEvaluatorV01(JSON.stringify({
    ...completeEvaluatorPayload,
    orientation: { state: 'pass', detectedView: 'material_detail', evidence: 'source-supported upper-material crop' },
    studio: { state: 'not_applicable', evidence: 'detail crop' },
  }), 'detail')
  assert.equal(unsupported.state, 'unknown')
  assert.ok(unsupported.reasonCodes.includes('studio_unsupported_state'))

  const missing = parseVisualQualityEvaluatorV01(JSON.stringify({
    color: completeEvaluatorPayload.color,
    topology: completeEvaluatorPayload.topology,
    orientation: completeEvaluatorPayload.orientation,
  }), 'back')
  assert.equal(missing.state, 'unknown')
  assert.ok(missing.reasonCodes.includes('studio_missing'))
})

check('7k generation and evaluation share one canonical material-zone contract', () => {
  for (const slotId of GENERATED_SLOT_KEYS) {
    const canonical = buildVisualLockV01MaterialContractPrompt(context, slotId)
    assert.ok(buildVisualLockV01PromptFixture(context)[GENERATED_SLOT_KEYS.indexOf(slotId)].includes(canonical))
    assert.ok(buildVisualQualityEvaluatorPromptV01(context, slotId).includes(canonical))
  }
  assert.deepEqual(VISUAL_LOCK_V01_MATERIAL_CONTRACT.reasonCodes, [
    'UNSUPPORTED_MATERIAL_ADDITION',
    'MATERIAL_ZONE_DRIFT',
    'MATERIAL_EVIDENCE_INSUFFICIENT',
  ])
})

check('7l material contract preserves zones and forbids unsupported additions and conversions', () => {
  const prompt = buildVisualLockV01MaterialContractPrompt(context, 'side')
  assert.match(prompt, /material class; color family; surface finish; texture character; visible coverage; material-zone boundaries/i)
  assert.match(prompt, /lining; trim; plaque; material overlay; decorative surface/i)
  assert.match(prompt, /napped material to smooth material/i)
  assert.match(prompt, /napped material to pebbled material/i)
  assert.match(prompt, /napped material to woven material/i)
  assert.match(prompt, /matte material to glossy material/i)
  assert.match(prompt, /small supported metal zone.*must never expand/i)
  assert.match(prompt, /must not disappear, expand, contract, move, or replace/i)
  assert.match(prompt, /continue the nearest source-supported base material conservatively/i)
  assert.match(prompt, /minor lighting, compression, or exposure variation is not material drift/i)
  assert.match(prompt, /cannot establish material identity reliably, return UNKNOWN/i)
  assert.doesNotMatch(prompt, /Product 349|BOSS|burgundy|horsebit/i)
})

check('7m a clearly unsupported material addition fails with a stable reason', () => {
  const result = parseVisualQualityEvaluatorV01(JSON.stringify({
    ...completeEvaluatorPayload,
    material: {
      state: 'fail',
      reasonCodes: ['UNSUPPORTED_MATERIAL_ADDITION'],
      evidence: 'a new glossy plaque and contrasting lining are clearly visible',
    },
  }), 'back')
  assert.equal(result.material.state, 'fail')
  assert.deepEqual(result.material.reasonCodes, ['UNSUPPORTED_MATERIAL_ADDITION'])
  assert.equal(result.state, 'fail')
  assert.ok(result.reasonCodes.includes('UNSUPPORTED_MATERIAL_ADDITION'))
})

check('7n expansion of a supported localized metal zone fails as material-zone drift', () => {
  const result = parseVisualQualityEvaluatorV01(JSON.stringify({
    ...completeEvaluatorPayload,
    material: {
      state: 'fail',
      reasonCodes: ['MATERIAL_ZONE_DRIFT'],
      evidence: 'the localized source-supported metal zone expands across the full upper width',
    },
  }), 'hero_3q')
  assert.equal(result.material.state, 'fail')
  assert.deepEqual(result.material.reasonCodes, ['MATERIAL_ZONE_DRIFT'])
  assert.equal(result.state, 'fail')
})

check('7o clear material-type or texture conversion fails', () => {
  for (const evidenceText of [
    'source-supported napped material became smooth',
    'source-supported napped material became pebbled',
    'source-supported napped material became woven',
    'source-supported matte material became glossy and synthetic-looking',
  ]) {
    const result = parseVisualQualityEvaluatorV01(JSON.stringify({
      ...completeEvaluatorPayload,
      material: { state: 'fail', reasonCodes: ['MATERIAL_ZONE_DRIFT'], evidence: evidenceText },
    }), 'side')
    assert.equal(result.material.state, 'fail')
    assert.ok(result.reasonCodes.includes('MATERIAL_ZONE_DRIFT'))
  }
})

check('7p clear material-zone movement, replacement, expansion, or loss fails', () => {
  for (const evidenceText of [
    'the upper material zone moved from the vamp to the quarter',
    'the source-supported trim material was replaced by another finish',
    'the accent material zone expanded beyond its source boundary',
    'the source-supported material zone disappeared',
  ]) {
    const result = parseVisualQualityEvaluatorV01(JSON.stringify({
      ...completeEvaluatorPayload,
      material: { state: 'fail', reasonCodes: ['MATERIAL_ZONE_DRIFT'], evidence: evidenceText },
    }), 'top')
    assert.equal(result.state, 'fail')
    assert.equal(result.material.state, 'fail')
  }
})

check('7q supported material zones pass and minor lighting variation is not drift', () => {
  const supported = parseVisualQualityEvaluatorV01(JSON.stringify(completeEvaluatorPayload), 'back')
  assert.equal(supported.material.state, 'pass')
  assert.equal(supported.state, 'pass')

  const lightingOnly = parseVisualQualityEvaluatorV01(JSON.stringify({
    ...completeEvaluatorPayload,
    material: {
      state: 'pass',
      reasonCodes: [],
      evidence: 'minor exposure variation only; material class, texture, coverage, and boundaries remain preserved',
    },
  }), 'back')
  assert.equal(lightingOnly.material.state, 'pass')
  assert.equal(lightingOnly.state, 'pass')
  assert.ok(!lightingOnly.reasonCodes.includes('MATERIAL_ZONE_DRIFT'))
})

check('7r insufficient or invalid material evidence remains unknown and blocks', () => {
  const insufficient = parseVisualQualityEvaluatorV01(JSON.stringify({
    ...completeEvaluatorPayload,
    material: {
      state: 'unknown',
      reasonCodes: ['MATERIAL_EVIDENCE_INSUFFICIENT'],
      evidence: 'source coverage and generated detail resolution cannot establish the material reliably',
    },
  }), 'back')
  assert.equal(insufficient.material.state, 'unknown')
  assert.equal(insufficient.state, 'unknown')
  assert.ok(insufficient.reasonCodes.includes('MATERIAL_EVIDENCE_INSUFFICIENT'))
  assert.equal(combineVisualQualityGateV01([insufficient.state], 'pass'), 'unknown')

  const invalidMaterialResults = [
    { ...completeEvaluatorPayload, material: undefined },
    { ...completeEvaluatorPayload, material: { state: 'pass', reasonCodes: [], evidence: '' } },
    { ...completeEvaluatorPayload, material: { state: 'fail', reasonCodes: [], evidence: 'clear drift' } },
    { ...completeEvaluatorPayload, material: { state: 'pass', reasonCodes: ['MATERIAL_ZONE_DRIFT'], evidence: 'contradictory' } },
    { ...completeEvaluatorPayload, material: { state: 'fail', reasonCodes: ['UNSUPPORTED_VALUE'], evidence: 'unsupported code' } },
    { ...completeEvaluatorPayload, material: { state: 'unsupported', reasonCodes: [], evidence: 'unsupported state' } },
  ]
  for (const payload of invalidMaterialResults) {
    assert.equal(parseVisualQualityEvaluatorV01(JSON.stringify(payload), 'back').state, 'unknown')
  }

  const clearFailure = parseVisualQualityEvaluatorV01(JSON.stringify({
    ...completeEvaluatorPayload,
    material: { state: 'fail', reasonCodes: ['MATERIAL_ZONE_DRIFT'], evidence: 'material zone moved' },
  }), 'back')
  assert.equal(combineVisualQualityGateV01([clearFailure.state], 'pass'), 'fail')
})

check('7s material_detail receives the same fidelity contract without replacing its crop or angle', () => {
  const canonical = buildVisualLockV01MaterialContractPrompt(context, 'detail')
  assert.ok(buildVisualLockV01PromptFixture(context)[4].includes(canonical))
  assert.ok(buildVisualQualityEvaluatorPromptV01(context, 'detail').includes(canonical))
  assert.match(canonical, /preserve the existing material_detail crop and angle contract/i)
  assert.match(canonical, /source-supported primary upper-material zone/i)
  assert.match(canonical, /never convert the detail into a hardware, logo, ornament, or branding close-up/i)
})

check('7t generation and evaluation share one canonical topology contract in every slot', () => {
  assert.equal(VISUAL_LOCK_V01_COMPONENT_TOPOLOGY_CONTRACT.version, COMPONENT_TOPOLOGY_LOCK_V01_VERSION)
  assert.deepEqual(VISUAL_LOCK_V01_COMPONENT_TOPOLOGY_CONTRACT.reasonCodes, VISUAL_LOCK_V01_COMPONENT_TOPOLOGY_REASON_CODES)
  for (const slotId of GENERATED_SLOT_KEYS) {
    const canonical = buildVisualLockV01ComponentTopologyContractPrompt(context, slotId)
    assert.ok(buildVisualLockV01PromptFixture(context)[GENERATED_SLOT_KEYS.indexOf(slotId)].includes(canonical))
    assert.ok(buildVisualQualityEvaluatorPromptV01(context, slotId).includes(canonical))
  }
  const prompt = buildVisualLockV01ComponentTopologyContractPrompt(context, 'side')
  assert.match(prompt, /presence and source-supported absence/i)
  assert.match(prompt, /adjacency, overlap, containment, and layering/i)
  assert.match(prompt, /cross-view component identity and continuity/i)
  assert.match(prompt, /one shoe into a pair, second shoe, mirrored shoe, or changed handedness/i)
  assert.match(prompt, /another generated slot is never source authority/i)
  assert.doesNotMatch(prompt, /Product 349|\bBOSS\b|horsebit|burgundy/i)
})

check('7u every prohibited topology drift produces fail with its stable reason code', () => {
  const cases = [
    ['UNSUPPORTED_COMPONENT_ADDITION', 'an unsupported buckle was added'],
    ['SOURCE_COMPONENT_REMOVAL', 'the source-supported pull tab was removed'],
    ['COMPONENT_COUNT_DRIFT', 'one loop was duplicated'],
    ['COMPONENT_COUNT_DRIFT', 'two source panels were merged into one'],
    ['COMPONENT_COUNT_DRIFT', 'one source overlay was split into two'],
    ['COMPONENT_TOPOLOGY_HALLUCINATION', 'the source closure category became a different functional assembly'],
    ['COMPONENT_SHAPE_DRIFT', 'the curved overlay became a rectangular panel'],
    ['COMPONENT_TOPOLOGY_HALLUCINATION', 'a localized ornament became a spanning hardware assembly'],
    ['COMPONENT_RELOCATION', 'the pull tab moved to the outer side and rotated'],
    ['COMPONENT_ATTACHMENT_DRIFT', 'the strap was reattached to an invented anchor'],
    ['COMPONENT_ADJACENCY_DRIFT', 'the overlay no longer overlaps the source-supported panel edge'],
    ['UNSUPPORTED_COMPONENT_ADDITION', 'an unsupported seam and panel boundary were added'],
    ['SOURCE_COMPONENT_REMOVAL', 'a source-supported stitching boundary disappeared'],
    ['BRAND_PLACEMENT_DRIFT', 'the embossed brand moved zones and became a metal plaque'],
    ['PRODUCT_COUNT_DRIFT', 'the source single shoe became a mirrored pair'],
  ] as const
  for (const [reasonCode, evidenceText] of cases) {
    const result = parseVisualQualityEvaluatorV01(JSON.stringify({
      ...completeEvaluatorPayload,
      topology: { state: 'fail', reasonCodes: [reasonCode], evidence: evidenceText },
    }), 'back')
    assert.equal(result.topology.state, 'fail', evidenceText)
    assert.deepEqual(result.topology.reasonCodes, [reasonCode])
    assert.equal(result.state, 'fail')
    assert.ok(result.reasonCodes.includes(reasonCode))
    assert.equal(combineVisualQualityGateV01([result.state], 'pass'), 'fail')
  }
})

check('7v preserved topology passes and insufficient topology evidence is unknown', () => {
  const preserved = parseVisualQualityEvaluatorV01(JSON.stringify(completeEvaluatorPayload), 'back')
  assert.equal(preserved.topology.state, 'pass')
  assert.deepEqual(preserved.topology.reasonCodes, [])

  const insufficient = parseVisualQualityEvaluatorV01(JSON.stringify({
    ...completeEvaluatorPayload,
    topology: {
      state: 'unknown',
      reasonCodes: ['COMPONENT_EVIDENCE_INSUFFICIENT'],
      evidence: 'the source does not reveal the hidden attachment point',
    },
  }), 'back')
  assert.equal(insufficient.topology.state, 'unknown')
  assert.deepEqual(insufficient.topology.reasonCodes, ['COMPONENT_EVIDENCE_INSUFFICIENT'])
  assert.equal(insufficient.state, 'unknown')
  assert.equal(combineVisualQualityGateV01([insufficient.state], 'pass'), 'unknown')

  const partialSourceContext = buildVisualLockV01Context({
    family: 'generic',
    identityEvidence: { closureType: 'slip-on' },
  })
  const unsupportedPass = parseVisualQualityEvaluatorWithContextV01(
    JSON.stringify(completeEvaluatorPayload),
    'back',
    partialSourceContext,
  )
  assert.equal(unsupportedPass.topology.state, 'unknown')
  assert.deepEqual(unsupportedPass.topology.reasonCodes, ['COMPONENT_EVIDENCE_INSUFFICIENT'])
  assert.ok(unsupportedPass.reasonCodes.includes('topology_source_evidence_incomplete'))
})

check('7w partial, malformed, unsupported, and state-incompatible topology verdicts remain unknown', () => {
  const invalidTopologyResults = [
    { state: 'pass', evidence: 'preserved' },
    { state: 'pass', reasonCodes: ['SOURCE_COMPONENT_REMOVAL'], evidence: 'contradictory' },
    { state: 'fail', reasonCodes: [], evidence: 'drift without a stable reason' },
    { state: 'fail', reasonCodes: ['COMPONENT_EVIDENCE_INSUFFICIENT'], evidence: 'wrong reason for fail' },
    { state: 'unknown', reasonCodes: [], evidence: 'missing insufficiency reason' },
    { state: 'unknown', reasonCodes: ['SOURCE_COMPONENT_REMOVAL'], evidence: 'wrong reason for unknown' },
    { state: 'pass', reasonCodes: ['UNSUPPORTED_VALUE'], evidence: 'unsupported reason' },
    { state: 'unsupported', reasonCodes: [], evidence: 'unsupported state' },
    { state: 'pass', reasonCodes: [], evidence: '' },
  ]
  for (const topology of invalidTopologyResults) {
    const result = parseVisualQualityEvaluatorV01(JSON.stringify({ ...completeEvaluatorPayload, topology }), 'back')
    assert.equal(result.topology.state, 'unknown')
    assert.equal(result.state, 'unknown')
    assert.deepEqual(result.topology.reasonCodes, [])
  }
})

check('7x material_detail crop preserves visible topology without treating outside-crop components as removals', () => {
  const canonical = buildVisualLockV01ComponentTopologyContractPrompt(context, 'detail')
  assert.ok(buildVisualLockV01PromptFixture(context)[4].includes(canonical))
  assert.ok(buildVisualQualityEvaluatorPromptV01(context, 'detail').includes(canonical))
  assert.match(canonical, /outside-crop component a removal/i)
  assert.match(canonical, /no visible component may be omitted/i)
  assert.match(canonical, /visible cropped component and boundary must remain structurally correct/i)
  assert.match(canonical, /never permits invented hardware, logos, seams, plaques, or attachment points/i)
  assert.match(canonical, /does not redefine the angle, studio, material-zone, framing, geometry/i)
})

check('8 malformed, missing, unsupported, and incomplete evaluator output are unknown', () => {
  assert.equal(parseVisualQualityEvaluatorV01('{bad', 'back').state, 'unknown')
  assert.equal(parseVisualQualityEvaluatorV01('{}', 'back').state, 'unknown')
  assert.equal(parseVisualQualityEvaluatorV01(JSON.stringify({ color: { state: 'yes', evidence: 'x' }, topology: { state: 'pass', reasonCodes: [], evidence: 'x' }, orientation: { state: 'pass', detectedView: 'true_rear', evidence: 'x' } }), 'back').state, 'unknown')
  assert.equal(parseVisualQualityEvaluatorV01(JSON.stringify({ color: { state: 'pass' }, topology: { state: 'pass', reasonCodes: [], evidence: 'x' }, orientation: { state: 'pass', detectedView: 'true_rear', evidence: 'x' } }), 'back').state, 'unknown')
  assert.equal(parseVisualQualityEvaluatorV01(JSON.stringify({ color: { state: 'pass', evidence: 'grey upper' }, topology: { state: 'pass', reasonCodes: [], evidence: 'x' }, orientation: { state: 'pass', detectedView: 'true_rear', evidence: 'x' } }), 'back').state, 'unknown')
  assert.equal(parseVisualQualityEvaluatorV01(JSON.stringify({ color: { state: 'pass', detectedColor: 'grey', evidence: 'grey upper' }, topology: { state: 'pass', reasonCodes: [], evidence: 'x' }, orientation: { state: 'pass', detectedView: 'sideways', evidence: 'x' } }), 'back').state, 'unknown')
})

check('9 explicit fail outranks unknown and pass', () => {
  const result = parseVisualQualityEvaluatorV01(JSON.stringify({ color: { state: 'unknown', detectedColor: 'unknown', evidence: '' }, topology: { state: 'fail', reasonCodes: ['SOURCE_COMPONENT_REMOVAL'], evidence: 'patch removed' }, orientation: { state: 'pass', detectedView: 'top', evidence: 'overhead view' } }), 'top')
  assert.equal(result.state, 'fail')
})

check('10 only true_rear can pass the back evaluator', () => {
  const pass = parseVisualQualityEvaluatorV01(JSON.stringify({ ...completeEvaluatorPayload, color: { state: 'pass', detectedColor: 'grey', evidence: 'grey upper' }, topology: { state: 'pass', reasonCodes: [], evidence: 'patch retained' }, orientation: { state: 'pass', detectedView: 'true_rear', evidence: 'symmetric heel edges' } }), 'back')
  assert.equal(pass.state, 'pass')
  const mismatch = parseVisualQualityEvaluatorV01(JSON.stringify({ ...completeEvaluatorPayload, color: { state: 'pass', detectedColor: 'grey', evidence: 'grey upper' }, topology: { state: 'pass', reasonCodes: [], evidence: 'patch retained' }, orientation: { state: 'pass', detectedView: 'rear_three_quarter', evidence: 'side face visible' } }), 'back')
  assert.equal(mismatch.state, 'fail')
  assert.ok(mismatch.reasonCodes.includes('back_not_true_rear'))
})

function providerEnvelope(text: string, finishReason: string = 'STOP'): unknown {
  return { candidates: [{ finishReason, content: { parts: [{ text }] } }] }
}

check('10a complete valid provider response preserves pass and fail for STOP or MAX_TOKENS', () => {
  const pass = normalizeVisualQualityProviderResponseV01(
    providerEnvelope(JSON.stringify(completeEvaluatorPayload), 'MAX_TOKENS'),
    'back',
  )
  assert.equal(pass.state, 'pass')

  const fail = normalizeVisualQualityProviderResponseV01(providerEnvelope(JSON.stringify({
    ...completeEvaluatorPayload,
    topology: { state: 'fail', reasonCodes: ['SOURCE_COMPONENT_REMOVAL'], evidence: 'source-supported instep patch is absent' },
  })), 'back')
  assert.equal(fail.state, 'fail')
  assert.ok(fail.reasonCodes.includes('component_topology_failed'))
})

check('10b partial provider response remains unknown', () => {
  const result = normalizeVisualQualityProviderResponseV01(
    providerEnvelope('{"color":{"state":"pass"', 'MAX_TOKENS'),
    'back',
  )
  assert.equal(result.state, 'unknown')
  assert.deepEqual(result.reasonCodes, ['malformed_response'])
})

check('10c malformed provider response remains unknown', () => {
  const result = normalizeVisualQualityProviderResponseV01(providerEnvelope('not json'), 'back')
  assert.equal(result.state, 'unknown')
  assert.deepEqual(result.reasonCodes, ['malformed_response'])
  assert.deepEqual(result.topology.reasonCodes, [])
})

check('10d provider error remains unknown', () => {
  const result = normalizeVisualQualityProviderResponseV01({ error: { code: 503 } }, 'back')
  assert.equal(result.state, 'unknown')
  assert.deepEqual(result.reasonCodes, ['provider_error'])
  assert.deepEqual(result.topology.reasonCodes, [])
})

check('10e unsupported provider and evaluator status values remain unknown', () => {
  const unsupportedFinish = normalizeVisualQualityProviderResponseV01(
    providerEnvelope(JSON.stringify(completeEvaluatorPayload), 'SAFETY'),
    'back',
  )
  assert.equal(unsupportedFinish.state, 'unknown')
  assert.deepEqual(unsupportedFinish.reasonCodes, ['provider_response_incomplete'])

  const unsupportedState = normalizeVisualQualityProviderResponseV01(providerEnvelope(JSON.stringify({
    ...completeEvaluatorPayload,
    color: { state: 'yes', detectedColor: 'light grey', evidence: 'visible' },
  })), 'back')
  assert.equal(unsupportedState.state, 'unknown')
  assert.ok(unsupportedState.reasonCodes.includes('color_unsupported_state'))
})

check('10f missing required provider or evaluator fields remain unknown', () => {
  const missingText = normalizeVisualQualityProviderResponseV01(
    { candidates: [{ finishReason: 'STOP', content: { parts: [{}] } }] },
    'back',
  )
  assert.equal(missingText.state, 'unknown')
  assert.deepEqual(missingText.reasonCodes, ['provider_response_missing'])

  const missingTopology = normalizeVisualQualityProviderResponseV01(providerEnvelope(JSON.stringify({
    color: completeEvaluatorPayload.color,
    orientation: completeEvaluatorPayload.orientation,
  })), 'back')
  assert.equal(missingTopology.state, 'unknown')
  assert.ok(missingTopology.reasonCodes.includes('topology_missing'))
})

check('11 per-slot geometry gates exact occupancy and centering boundaries', () => {
  assert.equal(evaluateVisualGeometryMeasurementV01('side', { occupancyPercent: 72, centerOffsetXPercent: 3, centerOffsetYPercent: 0, maximumCenterOffsetPercent: 3, clippingDetected: false }).state, 'pass')
  assert.equal(evaluateVisualGeometryMeasurementV01('side', { occupancyPercent: 82, centerOffsetXPercent: 0, centerOffsetYPercent: 3, maximumCenterOffsetPercent: 3, clippingDetected: false }).state, 'pass')
  assert.equal(evaluateVisualGeometryMeasurementV01('side', { occupancyPercent: 71.999, centerOffsetXPercent: 0, centerOffsetYPercent: 0, maximumCenterOffsetPercent: 0, clippingDetected: false }).state, 'fail')
  const clipped = evaluateVisualGeometryMeasurementV01('side', { occupancyPercent: 76, centerOffsetXPercent: 0, centerOffsetYPercent: 0, maximumCenterOffsetPercent: 0, clippingDetected: true })
  assert.equal(clipped.state, 'fail')
  assert.equal(clipped.clippingState, 'fail')
  assert.ok(clipped.reasonCodes.includes('clipping_detected'))
  assert.equal(evaluateVisualGeometryMeasurementV01('side', null).state, 'unknown')
  assert.equal(evaluateVisualGeometryMeasurementV01('detail', null).applicable, false)
})

check('12 pack spread is fail-closed and capped at eight points', () => {
  const result = (slotId: 'side' | 'hero_3q' | 'top' | 'back', occupancyPercent: number) => evaluateVisualGeometryMeasurementV01(slotId, { occupancyPercent, centerOffsetXPercent: 0, centerOffsetYPercent: 0, maximumCenterOffsetPercent: 0, clippingDetected: false })
  assert.equal(evaluateVisualGeometryPackV01([result('side', 72), result('hero_3q', 80), result('top', 76), result('back', 78)]).state, 'pass')
  assert.equal(evaluateVisualGeometryPackV01([result('side', 72), result('hero_3q', 81), result('top', 76), result('back', 78)]).state, 'fail')
  assert.equal(evaluateVisualGeometryPackV01([result('side', 72)]).state, 'unknown')
})

check('13 no evaluator ambiguity or geometry failure can be represented as pass', () => {
  for (const raw of ['', 'null', '[]', '{"color":null}']) assert.notEqual(parseVisualQualityEvaluatorV01(raw, 'side').state, 'pass')
  assert.notEqual(evaluateVisualGeometryMeasurementV01('side', null).state, 'pass')
  assert.equal(combineVisualQualityGateV01(['pass', 'unknown'], 'pass'), 'unknown')
  assert.equal(combineVisualQualityGateV01(['pass', 'fail'], 'unknown'), 'fail')
  assert.equal(combineVisualQualityGateV01([], 'pass'), 'unknown')
})

check('14 V0.1 pure contracts add no provider, schema, mutation, approval, or Telegram side effect', () => {
  const source = readFileSync(new URL('./imageVisualLockV01.ts', import.meta.url), 'utf8')
  assert.doesNotMatch(source, /\bfetch\s*\(/)
  assert.doesNotMatch(source, /payload\.(?:create|update|delete)|sendTelegram|jobs\.queue|generativeGallery/)
  assert.doesNotMatch(source, /payload\.(?:create|update|delete)|sendTelegram|jobs\.queue|generateBy(?:Editing|GeminiPro)/)
})

check('15 V0.1 profile versions are exact', () => {
  assert.equal(VISUAL_LOCK_V01_PROFILE_VERSION, 'visual-lock/v0.1')
  assert.equal(COMPONENT_TOPOLOGY_LOCK_V01_VERSION, 'component-topology-lock/v0.1')
  assert.equal(VISUAL_QUALITY_EVALUATOR_V01_VERSION, 'visual-quality-evaluator/v0.1')
  assert.equal(VISUAL_GEOMETRY_GATE_V01_VERSION, 'visual-geometry-gate/v0.1')
  assert.equal(VISUAL_LOCK_V01_ANGLE_CONTRACT_VERSION, 'visual-angle-contract/v1')
  assert.equal(VISUAL_LOCK_V01_STUDIO_CONTRACT_VERSION, 'visual-studio-contract/v1')
  assert.equal(VISUAL_LOCK_V01_MATERIAL_CONTRACT_VERSION, 'material-zone-fidelity-contract/v1')
  assert.equal(VISUAL_LOCK_V01_STUDIO_CONTRACT.backgroundTarget, 'uniform matte warm-neutral near-white, visually approximately #F7F5F0')
})

check('16 V0.1 prompt fixture digest is pinned', () => {
  const digest = createHash('sha256').update(JSON.stringify(buildVisualLockV01PromptFixture(context))).digest('hex')
  assert.equal(digest, 'e8c1becfcb7d04528a22cdb40584088b0b455589170a3c6bb1376ef05eccdb47')
})

check('17 complete non-pass evidence remains inspectable before persistence authorization', () => {
  const occupancy = { side: 72, hero_3q: 76, top: 78, back: 80, detail: 90 } as const
  const geometry = GENERATED_SCENES.map((scene) => evaluateVisualGeometryMeasurementV01(scene.name, {
    occupancyPercent: occupancy[scene.name],
    centerOffsetXPercent: 1,
    centerOffsetYPercent: 2,
    maximumCenterOffsetPercent: 2,
    clippingDetected: false,
  }))
  const geometryPack = evaluateVisualGeometryPackV01(geometry)
  const summary = buildVisualQualityGateSummaryV01({
    context,
    geometryPack,
    slots: GENERATED_SCENES.map((scene, index) => ({
      slotId: scene.name,
      evaluatorStatus: 'unknown',
      evaluatorReasonCodes: ['provider_response_incomplete'],
      orientationStatus: 'unknown',
      detectedView: 'unknown',
      topologyStatus: 'unknown',
      topologyReasonCodes: ['COMPONENT_EVIDENCE_INSUFFICIENT'],
      studioStatus: 'unknown',
      materialStatus: 'unknown',
      materialReasonCodes: ['MATERIAL_EVIDENCE_INSUFFICIENT'],
      geometry: geometry[index],
    })),
  })
  assert.equal(summary.slotResults.length, 5)
  assert.equal(summary.packResults.qualityGateStatus, 'unknown')
  assert.equal(summary.packResults.geometryGateStatus, 'pass')
  assert.equal(summary.packResults.occupancyMinimumPercent, 72)
  assert.equal(summary.packResults.occupancyMaximumPercent, 80)
  assert.equal(summary.packResults.occupancySpreadPercent, 8)
  assert.equal(summary.packResults.requiredEvaluatorCompleteness, 'unknown')
  assert.equal(summary.packResults.topologyGateStatus, 'unknown')
  assert.equal(summary.packResults.studioGateStatus, 'unknown')
  assert.equal(summary.packResults.materialGateStatus, 'unknown')
  assert.equal(summary.studioContractVersion, 'visual-studio-contract/v1')
  assert.equal(summary.materialContractVersion, 'material-zone-fidelity-contract/v1')
  assert.ok(summary.packResults.reasonCodes.includes('provider_response_incomplete'))
  assert.ok(summary.packResults.reasonCodes.includes('COMPONENT_EVIDENCE_INSUFFICIENT'))
  assert.ok(summary.packResults.reasonCodes.includes('MATERIAL_EVIDENCE_INSUFFICIENT'))
  assert.ok(summary.slotResults.every((slot) => slot.geometryStatus === 'pass'
    && slot.occupancyPercent !== null
    && slot.topologyResult.status === 'unknown'
    && slot.topologyResult.reasonCodes[0] === 'COMPONENT_EVIDENCE_INSUFFICIENT'
    && slot.studioResult.status === 'unknown'
    && slot.materialResult.status === 'unknown'
    && slot.materialResult.reasonCodes[0] === 'MATERIAL_EVIDENCE_INSUFFICIENT'))

  const incompletePass = buildVisualQualityGateSummaryV01({
    context,
    geometryPack,
    slots: GENERATED_SCENES.slice(0, 4).map((scene, index) => ({
      slotId: scene.name,
      evaluatorStatus: 'pass',
      evaluatorReasonCodes: [],
      orientationStatus: 'pass',
      detectedView: scene.name,
      topologyStatus: 'pass',
      topologyReasonCodes: [],
      studioStatus: 'pass',
      materialStatus: 'pass',
      materialReasonCodes: [],
      geometry: geometry[index],
    })),
  })
  assert.equal(incompletePass.packResults.requiredEvaluatorCompleteness, 'unknown')
  assert.equal(incompletePass.packResults.qualityGateStatus, 'unknown')

  const materialUnknown = buildVisualQualityGateSummaryV01({
    context,
    geometryPack,
    slots: GENERATED_SCENES.map((scene, index) => ({
      slotId: scene.name,
      evaluatorStatus: 'pass',
      evaluatorReasonCodes: [],
      orientationStatus: 'pass',
      detectedView: VISUAL_LOCK_V01_ANGLE_CONTRACTS[scene.name].expectedDetectedView,
      topologyStatus: 'pass',
      topologyReasonCodes: [],
      studioStatus: 'pass',
      materialStatus: index === 0 ? 'unknown' : 'pass',
      materialReasonCodes: index === 0 ? ['MATERIAL_EVIDENCE_INSUFFICIENT'] : [],
      geometry: geometry[index],
    })),
  })
  assert.equal(materialUnknown.packResults.requiredEvaluatorCompleteness, 'pass')
  assert.equal(materialUnknown.packResults.materialGateStatus, 'unknown')
  assert.equal(materialUnknown.packResults.qualityGateStatus, 'unknown')

  const topologyUnknown = buildVisualQualityGateSummaryV01({
    context,
    geometryPack,
    slots: GENERATED_SCENES.map((scene, index) => ({
      slotId: scene.name,
      evaluatorStatus: 'pass',
      evaluatorReasonCodes: [],
      orientationStatus: 'pass',
      detectedView: VISUAL_LOCK_V01_ANGLE_CONTRACTS[scene.name].expectedDetectedView,
      topologyStatus: index === 0 ? 'unknown' : 'pass',
      topologyReasonCodes: index === 0 ? ['COMPONENT_EVIDENCE_INSUFFICIENT'] : [],
      studioStatus: 'pass',
      materialStatus: 'pass',
      materialReasonCodes: [],
      geometry: geometry[index],
    })),
  })
  assert.equal(topologyUnknown.packResults.requiredEvaluatorCompleteness, 'pass')
  assert.equal(topologyUnknown.packResults.topologyGateStatus, 'unknown')
  assert.equal(topologyUnknown.packResults.qualityGateStatus, 'unknown')
  assert.ok(topologyUnknown.packResults.reasonCodes.includes('COMPONENT_EVIDENCE_INSUFFICIENT'))
})

check('18 failure workflow clears only active visual state and preserves every sibling field', () => {
  const current = { workflowStatus: 'visual_pending', visualStatus: 'generating', confirmationStatus: 'pending' }
  assert.deepEqual(buildVisualLockV01FailureWorkflow(current), { ...current, visualStatus: 'rejected' })
  assert.equal(buildVisualLockV01FailureWorkflow({ ...current, visualStatus: 'approved' }), null)
  assert.equal(current.visualStatus, 'generating')
})

check('19 runtime wiring retains transient bytes through evidence and drops them before Media', () => {
  const attempt = createImageGenerationAttempt({
    jobId: 'fixture',
    requestedSlotIds: GENERATED_SCENES.map((scene) => scene.name),
    attemptId: 'iga_visual_lock_v01_fixture',
  })
  const blocked = blockImageSlotEnvelopesForQualityGate({
    state: 'unknown',
    reasonCodes: ['provider_response_incomplete'],
    slots: attempt.slots.map((slot) => ({
      ...slot,
      status: 'generated' as const,
      output: Buffer.from(slot.slotId),
      provider: {
        provider: 'fixture',
        attempts: 1,
        qualityEvaluatorState: 'unknown' as const,
        geometryGateState: 'pass' as const,
      },
    })),
  })
  assert.ok(blocked.every((slot) => slot.status === 'provider_failed'))
  assert.ok(blocked.every((slot) => slot.output === undefined))
  assert.ok(blocked.every((slot) => slot.failure?.code === 'quality_gate_failed'))
  assert.ok(blocked.every((slot) => slot.provider?.qualityEvaluatorState === 'unknown' && slot.provider.geometryGateState === 'pass'))

  const provider = readFileSync(new URL('./imageProviders.ts', import.meta.url), 'utf8')
  const contracts = readFileSync(new URL('./imageGenerationContracts.ts', import.meta.url), 'utf8')
  const task = readFileSync(new URL('../jobs/imageGenTask.ts', import.meta.url), 'utf8')
  const route = readFileSync(new URL('../app/api/telegram/route.ts', import.meta.url), 'utf8')
  assert.match(provider, /if \(isVisualLockV01Context\(visualLock\)\)/)
  assert.match(provider, /finalBuf = jpegBuf[\s\S]*quality\.state !== 'pass'/)
  assert.match(provider, /unknownVisualQualityEvaluatorResultV01\('evaluator_unavailable'\)/)
  assert.match(provider, /slotLog\.componentTopologyEvaluatorReasonCodes = result\.topology\.reasonCodes/)
  assert.match(provider, /slotLog\.materialEvaluatorState = result\.material\.state/)
  assert.match(provider, /slotLog\.materialEvaluatorReasonCodes = result\.material\.reasonCodes/)
  assert.equal((provider.match(/!isVisualLockV01Context\(visualLock\) && getSlotByKey\(scene\.name\)\?\.layout === 'pair'/g) ?? []).length, 2)
  assert.match(task, /measureVisualGeometryV01\(envelope\.output\)/)
  assert.match(task, /buildVisualQualityGateSummaryV01/)
  assert.match(task, /if \(qualityState !== 'pass'\)/)
  assert.match(task, /blockImageSlotEnvelopesForQualityGate/)
  assert.match(contracts, /code: 'quality_gate_failed'/)
  assert.match(contracts, /materialEvaluatorReasonCodes/)
  assert.match(contracts, /componentTopologyEvaluatorReasonCodes/)
  assert.match(task, /buildVisualLockV01FailureWorkflow/)
  assert.match(task, /materialFidelity: visualLockContext\.materialContractVersion/)
  assert.match(task, /materialStatus: slot\.provider\?\.materialEvaluatorState \?\? 'unknown'/)
  assert.match(task, /topologyReasonCodes: slot\.provider\?\.componentTopologyEvaluatorReasonCodes/)
  assert.ok(task.lastIndexOf('blockImageSlotEnvelopesForQualityGate({') < task.indexOf('persistGeneratedSlotEnvelopes({'))
  assert.match(route, /parseVisualLockCommand/)
})

console.log(`\nimageVisualLockV01: ${passed} checks passed${process.exitCode ? ' — WITH FAILURES' : ' — ALL OK'}`)
