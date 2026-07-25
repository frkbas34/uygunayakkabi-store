import assert from 'node:assert'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const scriptPath = 'scripts/vps-deploy.sh'
const script = readFileSync(scriptPath, 'utf8')

for (const phrase of [
  '--reactivate-openclaw',
  '--confirm-vps-sync',
  'Hermes/Mentix is current',
  'OpenClaw VPS sync',
  'OPENCLAW_VPS_VERIFICATION.md',
  'exit 2',
]) {
  assert.ok(script.includes(phrase), `${scriptPath} must include: ${phrase}`)
}

assert.ok(
  script.indexOf('if [[ "$reactivate_openclaw"') < script.indexOf('cp "$OPENCLAW_CONFIG"'),
  'OpenClaw reactivation guard must run before any VPS configuration write',
)
assert.ok(
  script.indexOf('if [[ "$reactivate_openclaw"') < script.indexOf('cd /opt/openclaw\n  docker compose restart'),
  'OpenClaw reactivation guard must run before the container restart',
)

for (const args of [[], ['--reactivate-openclaw']]) {
  const result = spawnSync('bash', [scriptPath, ...args], {
    cwd: process.cwd(),
    encoding: 'utf8',
  })

  assert.strictEqual(result.status, 2, `unguarded invocation ${args.join(' ') || '<none>'} must refuse`)
  assert.ok(
    `${result.stdout}\n${result.stderr}`.includes('Refusing OpenClaw VPS sync'),
    'unguarded invocation must explain the reactivation requirement',
  )
}

console.log('openclawVpsDeployGovernance: legacy VPS deploy is explicitly reactivation-only - ALL OK')
