import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

import { GENERATED_SCENES } from './imageSlotContract'
import {
  buildVisualLockV01Context,
  buildVisualLockV01PromptFixture,
  combineVisualQualityGateV01,
  COMPONENT_TOPOLOGY_LOCK_V01_VERSION,
  evaluateVisualGeometryMeasurementV01,
  evaluateVisualGeometryPackV01,
  parseVisualLockCommand,
  parseVisualQualityEvaluatorV01,
  resolveVisualLockTaskSelection,
  VISUAL_GEOMETRY_GATE_V01_VERSION,
  VISUAL_LOCK_V01_PROFILE_VERSION,
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
  visualNotes: 'no visible metal; repeated sole cavity rhythm',
}
const context = buildVisualLockV01Context({ family: 'generic', identityEvidence: evidence })

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
  assert.equal(context.componentTopologyHash.length, 64)
})

check('6 every V0.1 prompt carries all explicit contract versions and topology', () => {
  for (const prompt of buildVisualLockV01PromptFixture(context)) {
    assert.match(prompt, /visual-lock\/v0\.1/)
    assert.match(prompt, /component-topology-lock\/v0\.1/)
    assert.match(prompt, /visual-quality-evaluator\/v0\.1/)
    assert.match(prompt, /visual-geometry-gate\/v0\.1/)
    assert.ok(prompt.includes(context.componentTopologyHash))
  }
})

check('7 back prompt requires true rear and forbids rear-three-quarter', () => {
  assert.match(buildVisualLockV01PromptFixture(context)[3], /true straight rear/i)
  assert.match(buildVisualLockV01PromptFixture(context)[3], /rear-three-quarter view is forbidden/i)
})

check('8 malformed, missing, unsupported, and incomplete evaluator output are unknown', () => {
  assert.equal(parseVisualQualityEvaluatorV01('{bad', 'back').state, 'unknown')
  assert.equal(parseVisualQualityEvaluatorV01('{}', 'back').state, 'unknown')
  assert.equal(parseVisualQualityEvaluatorV01(JSON.stringify({ color: { state: 'yes', evidence: 'x' }, topology: { state: 'pass', evidence: 'x' }, orientation: { state: 'pass', detectedView: 'true_rear', evidence: 'x' } }), 'back').state, 'unknown')
  assert.equal(parseVisualQualityEvaluatorV01(JSON.stringify({ color: { state: 'pass' }, topology: { state: 'pass', evidence: 'x' }, orientation: { state: 'pass', detectedView: 'true_rear', evidence: 'x' } }), 'back').state, 'unknown')
  assert.equal(parseVisualQualityEvaluatorV01(JSON.stringify({ color: { state: 'pass', evidence: 'grey upper' }, topology: { state: 'pass', evidence: 'x' }, orientation: { state: 'pass', detectedView: 'true_rear', evidence: 'x' } }), 'back').state, 'unknown')
  assert.equal(parseVisualQualityEvaluatorV01(JSON.stringify({ color: { state: 'pass', detectedColor: 'grey', evidence: 'grey upper' }, topology: { state: 'pass', evidence: 'x' }, orientation: { state: 'pass', detectedView: 'sideways', evidence: 'x' } }), 'back').state, 'unknown')
})

check('9 explicit fail outranks unknown and pass', () => {
  const result = parseVisualQualityEvaluatorV01(JSON.stringify({ color: { state: 'unknown', detectedColor: 'unknown', evidence: '' }, topology: { state: 'fail', evidence: 'patch removed' }, orientation: { state: 'pass', detectedView: 'top', evidence: 'overhead view' } }), 'top')
  assert.equal(result.state, 'fail')
})

check('10 only true_rear can pass the back evaluator', () => {
  const pass = parseVisualQualityEvaluatorV01(JSON.stringify({ color: { state: 'pass', detectedColor: 'grey', evidence: 'grey upper' }, topology: { state: 'pass', evidence: 'patch retained' }, orientation: { state: 'pass', detectedView: 'true_rear', evidence: 'symmetric heel edges' } }), 'back')
  assert.equal(pass.state, 'pass')
  const mismatch = parseVisualQualityEvaluatorV01(JSON.stringify({ color: { state: 'pass', detectedColor: 'grey', evidence: 'grey upper' }, topology: { state: 'pass', evidence: 'patch retained' }, orientation: { state: 'pass', detectedView: 'rear_three_quarter', evidence: 'side face visible' } }), 'back')
  assert.equal(mismatch.state, 'fail')
  assert.ok(mismatch.reasonCodes.includes('back_not_true_rear'))
})

check('11 per-slot geometry gates exact occupancy and centering boundaries', () => {
  assert.equal(evaluateVisualGeometryMeasurementV01('side', { occupancyPercent: 72, centerOffsetXPercent: 3, centerOffsetYPercent: 0, maximumCenterOffsetPercent: 3 }).state, 'pass')
  assert.equal(evaluateVisualGeometryMeasurementV01('side', { occupancyPercent: 82, centerOffsetXPercent: 0, centerOffsetYPercent: 3, maximumCenterOffsetPercent: 3 }).state, 'pass')
  assert.equal(evaluateVisualGeometryMeasurementV01('side', { occupancyPercent: 71.999, centerOffsetXPercent: 0, centerOffsetYPercent: 0, maximumCenterOffsetPercent: 0 }).state, 'fail')
  assert.equal(evaluateVisualGeometryMeasurementV01('side', null).state, 'unknown')
  assert.equal(evaluateVisualGeometryMeasurementV01('detail', null).applicable, false)
})

check('12 pack spread is fail-closed and capped at eight points', () => {
  const result = (slotId: 'side' | 'hero_3q' | 'top' | 'back', occupancyPercent: number) => evaluateVisualGeometryMeasurementV01(slotId, { occupancyPercent, centerOffsetXPercent: 0, centerOffsetYPercent: 0, maximumCenterOffsetPercent: 0 })
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
})

check('16 V0.1 prompt fixture digest is pinned', () => {
  const digest = createHash('sha256').update(JSON.stringify(buildVisualLockV01PromptFixture(context))).digest('hex')
  assert.equal(digest, '71cd5e3d009864e0ae82947b636082aac0005e249c3b27aad9acc09439c6c243')
})

check('17 runtime wiring blocks non-pass evidence before Media persistence', () => {
  const provider = readFileSync(new URL('./imageProviders.ts', import.meta.url), 'utf8')
  const task = readFileSync(new URL('../jobs/imageGenTask.ts', import.meta.url), 'utf8')
  const route = readFileSync(new URL('../app/api/telegram/route.ts', import.meta.url), 'utf8')
  assert.match(provider, /if \(isVisualLockV01Context\(visualLock\)\)/)
  assert.match(provider, /quality\.state === 'pass'/)
  assert.match(provider, /unknownVisualQualityEvaluatorResultV01\('evaluator_unavailable'\)/)
  assert.match(task, /measureVisualGeometryV01\(envelope\.output\)/)
  assert.match(task, /if \(qualityState !== 'pass'\)/)
  assert.match(task, /code: 'quality_gate_failed'/)
  assert.ok(task.indexOf("code: 'quality_gate_failed'") < task.indexOf('persistGeneratedSlotEnvelopes({'))
  assert.match(route, /parseVisualLockCommand/)
})

console.log(`\nimageVisualLockV01: ${passed} checks passed${process.exitCode ? ' — WITH FAILURES' : ' — ALL OK'}`)
