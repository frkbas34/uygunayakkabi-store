import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

import type { ControlledFreshCandidateCreationDependencies } from '../src/lib/controlledFreshCandidateCreation'
import type { ControlledFreshCandidateTargetCapability } from '../src/lib/controlledFreshCandidateReceipt'
import {
  CONTROLLED_FRESH_CANDIDATE_CREATE_CONFIRMATION,
  CONTROLLED_FRESH_CANDIDATE_VERIFY_CONFIRMATION,
  controlledFreshCandidateRuntimeUsage,
  parseControlledFreshCandidateRuntimeArgs,
  runControlledFreshCandidateRuntime,
} from './controlled-fresh-candidate-runtime'
import {
  controlledFreshCandidateFilenameIsApproved,
  type ControlledFreshCandidateRuntimeResource,
  type ControlledFreshCandidateVerificationResource,
} from './controlled-fresh-candidate-runtime-resources'

function captureIo() {
  const stdout: string[] = []
  const stderr: string[] = []
  return {
    stdout,
    stderr,
    io: {
      stdout: (text: string) => { stdout.push(text) },
      stderr: (text: string) => { stderr.push(text) },
    },
  }
}

function child(args: string[]) {
  const tsxCli = path.resolve('node_modules/tsx/dist/cli.mjs')
  const script = path.resolve('scripts/controlled-fresh-candidate-runtime.ts')
  return spawnSync(process.execPath, [tsxCli, script, ...args], {
    cwd: process.cwd(),
    encoding: 'utf8',
    timeout: 10_000,
    env: {
      Path: process.env.Path ?? '',
      SystemRoot: process.env.SystemRoot ?? 'C:\\Windows',
      TEMP: process.env.TEMP ?? 'C:\\Windows\\Temp',
      TMP: process.env.TMP ?? 'C:\\Windows\\Temp',
      NODE_OPTIONS: '--unhandled-rejections=strict',
      PAYLOAD_DB_PUSH: 'synthetic-sentinel',
    },
  })
}

async function main(): Promise<void> {
  assert.deepEqual(parseControlledFreshCandidateRuntimeArgs([]), {
    ok: false,
    code: 'RUNTIME_CONFIRMATION_REQUIRED',
  })
  assert.deepEqual(parseControlledFreshCandidateRuntimeArgs(['--help']), {
    ok: true,
    helpRequested: true,
    mode: null,
  })
  assert.deepEqual(parseControlledFreshCandidateRuntimeArgs([
    CONTROLLED_FRESH_CANDIDATE_CREATE_CONFIRMATION,
    CONTROLLED_FRESH_CANDIDATE_VERIFY_CONFIRMATION,
  ]), { ok: false, code: 'RUNTIME_MODES_MIXED' })
  assert.deepEqual(parseControlledFreshCandidateRuntimeArgs([
    CONTROLLED_FRESH_CANDIDATE_CREATE_CONFIRMATION,
    CONTROLLED_FRESH_CANDIDATE_CREATE_CONFIRMATION,
  ]), { ok: false, code: 'RUNTIME_ARGUMENT_DUPLICATED' })
  assert.deepEqual(parseControlledFreshCandidateRuntimeArgs(['--product=77']), {
    ok: false,
    code: 'RUNTIME_ARGUMENT_UNKNOWN',
  })
  assert.deepEqual(parseControlledFreshCandidateRuntimeArgs(['--help', CONTROLLED_FRESH_CANDIDATE_CREATE_CONFIRMATION]), {
    ok: false,
    code: 'RUNTIME_ARGUMENT_UNKNOWN',
  })
  const usage = controlledFreshCandidateRuntimeUsage()
  assert.match(usage, /mutually exclusive/)
  assert.doesNotMatch(usage, /SN\d{4}|Product 77|349/)
  assert.equal(controlledFreshCandidateFilenameIsApproved('approved-random-name.png', 'approved-random-name.png'), true)
  assert.equal(controlledFreshCandidateFilenameIsApproved('approved-random-name.png', 'approved-random-name-1.png'), false)
  assert.equal(controlledFreshCandidateFilenameIsApproved(null, 'approved-random-name.png'), false)

  for (const argv of [
    [],
    ['--help'],
    ['--unknown'],
    [CONTROLLED_FRESH_CANDIDATE_CREATE_CONFIRMATION, CONTROLLED_FRESH_CANDIDATE_VERIFY_CONFIRMATION],
  ]) {
    let initialized = 0
    const io = captureIo()
    const code = await runControlledFreshCandidateRuntime({
      argv,
      io: io.io,
      initializeCreation: async () => { initialized += 1; throw new Error('must not initialize') },
      initializeVerification: async () => { initialized += 1; throw new Error('must not initialize') },
    })
    assert.equal(initialized, 0)
    assert.equal(code, argv.length === 1 && argv[0] === '--help' ? 0 : 2)
  }

  {
    const io = captureIo()
    let destroyed = 0
    process.env.PAYLOAD_DB_PUSH = 'synthetic-not-false'
    const resource: ControlledFreshCandidateRuntimeResource = {
      creationInput: null as never,
      creationDependencies: {} as ControlledFreshCandidateCreationDependencies,
      destroy: async () => { destroyed += 1; return { ok: true } },
    }
    const code = await runControlledFreshCandidateRuntime({
      argv: [CONTROLLED_FRESH_CANDIDATE_CREATE_CONFIRMATION],
      io: io.io,
      initializeCreation: async () => {
        assert.equal(process.env.PAYLOAD_DB_PUSH, 'false')
        return resource
      },
    })
    assert.equal(code, 3)
    assert.equal(destroyed, 1)
    assert.equal(io.stdout.length, 1)
    const report = JSON.parse(io.stdout[0] ?? '{}') as Record<string, unknown>
    assert.equal(report.eligibleForPublishing, false)
    assert.equal(JSON.stringify(report).includes('synthetic-not-false'), false)
  }

  {
    const io = captureIo()
    let teardownCalls = 0
    let teardownResult: Promise<{ ok: true }> | null = null
    const teardown = () => {
      if (!teardownResult) {
        teardownCalls += 1
        teardownResult = Promise.resolve({ ok: true as const })
      }
      return teardownResult
    }
    const unexpected = async () => { throw new Error('gateway must not be called for forged capability') }
    const resource: ControlledFreshCandidateVerificationResource = {
      capability: Object.freeze(Object.create(null)) as ControlledFreshCandidateTargetCapability,
      dependencies: {
        gateway: {
          readOwnedProduct: unexpected,
          readMediaPage: unexpected,
          readGeneratedGalleryOwnerPage: unexpected,
          readImageJobPage: unexpected,
          readQueueReceiptPage: unexpected,
          readBotEventPage: unexpected,
          readStoryJobPage: unexpected,
        },
        teardown,
      },
      destroy: teardown,
    }
    const code = await runControlledFreshCandidateRuntime({
      argv: [CONTROLLED_FRESH_CANDIDATE_VERIFY_CONFIRMATION],
      io: io.io,
      initializeVerification: async () => resource,
    })
    assert.equal(code, 4)
    assert.equal(teardownCalls, 1)
    const report = JSON.parse(io.stdout[0] ?? '{}') as Record<string, unknown>
    assert.equal(report.eligibleForPublishing, false)
    assert.equal(report.eligibleForVisualOnlyGeneration, false)
    assert.equal(JSON.stringify(report).includes('gateway must not be called'), false)
  }

  {
    const io = captureIo()
    let destroyCalls = 0
    const code = await runControlledFreshCandidateRuntime({
      argv: [CONTROLLED_FRESH_CANDIDATE_CREATE_CONFIRMATION],
      io: io.io,
      initializeCreation: async () => {
        const resource = {
          destroy: async () => { destroyCalls += 1; return { ok: true as const } },
        }
        throw Object.assign(new Error('sensitive-sentinel'), { resource })
      },
    })
    assert.equal(code, 1)
    assert.equal(destroyCalls, 0)
    assert.deepEqual(io.stderr, ['CONTROLLED_FRESH_CANDIDATE_INTERNAL_FAILURE'])
    assert.equal(JSON.stringify(io).includes('sensitive-sentinel'), false)
  }

  for (const args of [['--help'], ['--unknown'], []]) {
    const result = child(args)
    assert.equal(result.error, undefined)
    assert.equal(result.signal, null)
    assert.equal(result.status, args[0] === '--help' ? 0 : 2)
    assert.equal(result.stderr.includes('DATABASE_URI'), false)
    assert.equal(result.stderr.includes('BLOB_READ_WRITE_TOKEN'), false)
  }

  const runtimeSource = readFileSync(path.resolve('scripts/controlled-fresh-candidate-runtime.ts'), 'utf8')
  const resourcesSource = readFileSync(path.resolve('scripts/controlled-fresh-candidate-runtime-resources.ts'), 'utf8')
  assert.equal(runtimeSource.includes('process.exit('), false)
  assert.equal(runtimeSource.includes("parseControlledFreshCandidateRuntimeArgs(options.argv)"), true)
  assert.ok(runtimeSource.indexOf('parseControlledFreshCandidateRuntimeArgs(options.argv)') < runtimeSource.indexOf('options.initializeCreation ??'))
  assert.equal(resourcesSource.includes("process.env.PAYLOAD_DB_PUSH = 'false'"), true)
  assert.equal(resourcesSource.includes('push: false'), true)
  assert.equal(resourcesSource.includes('VERCEL_BLOB_RETRIES'), true)
  assert.equal(resourcesSource.includes('CONTROLLED_FRESH_CANDIDATE_BLOB_RETRY_BUDGET = 0'), true)
  assert.equal(resourcesSource.includes('multipart: false'), true)
  assert.equal(resourcesSource.includes("handleDelete: async () => { throw"), true)
  assert.equal(resourcesSource.includes('blobModule.del'), false)
  assert.equal(resourcesSource.includes('blobModule.list'), false)
  assert.equal(resourcesSource.includes("await open(markerPath, 'wx'"), true)
  assert.equal(resourcesSource.includes("await open(temporaryPath, 'wx'"), true)
  assert.equal(resourcesSource.includes('controlled_media_filename_changed'), true)
  assert.equal(resourcesSource.includes('controlledFreshCandidateFilenameIsApproved(expected, data.filename)'), true)
  assert.equal(resourcesSource.includes('overwriteExistingFiles: false'), true)
  assert.equal(resourcesSource.includes('tasks: []'), true)
  assert.equal(resourcesSource.includes('dotenv'), false)
  assert.equal(resourcesSource.includes('telegram'), false)
  assert.equal(resourcesSource.includes('openai'), false)
  assert.equal(resourcesSource.includes('gemini'), false)
  assert.equal(resourcesSource.includes('shopier'), false)
  assert.ok(resourcesSource.indexOf("if (process.env.PAYLOAD_DB_PUSH !== 'false')") < resourcesSource.indexOf("import('@vercel/blob')"))

  console.log('controlledFreshCandidateRuntime: ALL OK')
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error)
  process.exit(1)
})
