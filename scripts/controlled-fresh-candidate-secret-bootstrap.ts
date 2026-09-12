import { randomBytes, timingSafeEqual } from 'node:crypto'
import {
  closeSync,
  constants as fsConstants,
  existsSync,
  fstatSync,
  fsyncSync,
  linkSync,
  lstatSync,
  mkdirSync,
  openSync,
  readdirSync,
  realpathSync,
  statfsSync,
  unlinkSync,
  writeSync,
} from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import {
  CONTROLLED_FRESH_CANDIDATE_PERSISTENT_SECRET_ALLOWLIST,
  CONTROLLED_FRESH_CANDIDATE_SECRET_SOURCE_DIRECTORY,
  CONTROLLED_FRESH_CANDIDATE_SECRET_SOURCE_PATH,
  controlledFreshCandidateExternalSecretsAreValid,
  readControlledFreshCandidatePersistentSecrets,
  type ControlledFreshCandidatePersistentSecretName,
} from './controlled-fresh-candidate-secret-loader'
import {
  CONTROLLED_FRESH_CANDIDATE_AUTHORIZATION_KEY_ENV,
  CONTROLLED_FRESH_CANDIDATE_EXT4_MAGIC,
  CONTROLLED_FRESH_CANDIDATE_RECEIPT_KEY_ENV,
} from './controlled-fresh-candidate-runtime-resources'

export const CONTROLLED_FRESH_CANDIDATE_BOOTSTRAP_VERSION =
  'controlled-fresh-candidate-secret-bootstrap/v1' as const
export const CONTROLLED_FRESH_CANDIDATE_BOOTSTRAP_CONFIRMATION =
  '--confirm-controlled-fresh-candidate-secret-bootstrap' as const

export type ControlledFreshCandidateBootstrapStatus = 'CREATED' | 'REFUSED' | 'RECOVERY_REQUIRED'
export type ControlledFreshCandidateBootstrapReport = {
  version: typeof CONTROLLED_FRESH_CANDIDATE_BOOTSTRAP_VERSION
  status: ControlledFreshCandidateBootstrapStatus
  secretFileCreated: boolean
  keysIndependent: boolean
  durable: boolean
  eligibleForPublishing: false
}

type ExternalSecretValues = Pick<
  Record<ControlledFreshCandidatePersistentSecretName, string>,
  'DATABASE_URI' | 'PAYLOAD_SECRET' | 'BLOB_READ_WRITE_TOKEN'
>

type BootstrapFault =
  | 'after-partial-write'
  | 'file-fsync'
  | 'after-final-link'
  | 'directory-fsync'

export type ControlledFreshCandidateBootstrapOptions = {
  interactive: boolean
  providedSecrets: ExternalSecretValues
  randomBytesFn?: (size: number) => Buffer
  testOnlyDestinationPath?: string
  testOnlyObservedFilesystemType?: bigint
  testOnlyExpectedUid?: number
  testOnlyExpectedGid?: number
  testOnlyFault?: BootstrapFault
  testOnlyBeforeFinalLink?(): Promise<void> | void
}

function report(status: ControlledFreshCandidateBootstrapStatus, values?: {
  secretFileCreated?: boolean
  keysIndependent?: boolean
  durable?: boolean
}): ControlledFreshCandidateBootstrapReport {
  return {
    version: CONTROLLED_FRESH_CANDIDATE_BOOTSTRAP_VERSION,
    status,
    secretFileCreated: values?.secretFileCreated === true,
    keysIndependent: values?.keysIndependent === true,
    durable: values?.durable === true,
    eligibleForPublishing: false,
  }
}

function assertLinux(): void {
  if (
    process.platform !== 'linux'
    || typeof process.getuid !== 'function'
    || typeof process.getgid !== 'function'
  ) throw new Error('CONTROLLED_BOOTSTRAP_PLATFORM_REFUSED')
}

function fsyncDirectory(directoryPath: string, fault: boolean): void {
  const handle = openSync(
    directoryPath,
    fsConstants.O_RDONLY | fsConstants.O_DIRECTORY | fsConstants.O_NOFOLLOW,
  )
  try {
    if (fault) throw new Error('CONTROLLED_BOOTSTRAP_DURABILITY_UNCERTAIN')
    fsyncSync(handle)
  } finally {
    closeSync(handle)
  }
}

function assertPrivateDestinationDirectory(params: {
  directoryPath: string
  observedFilesystemType?: bigint
  expectedUid?: number
  expectedGid?: number
}): void {
  const metadata = lstatSync(params.directoryPath, { bigint: true })
  const filesystemType = params.observedFilesystemType
    ?? statfsSync(params.directoryPath, { bigint: true }).type
  if (
    !metadata.isDirectory()
    || metadata.isSymbolicLink()
    || metadata.uid !== BigInt(params.expectedUid ?? process.getuid!())
    || metadata.gid !== BigInt(params.expectedGid ?? process.getgid!())
    || (metadata.mode & 0o777n) !== 0o700n
    || filesystemType !== BigInt(CONTROLLED_FRESH_CANDIDATE_EXT4_MAGIC)
    || realpathSync(params.directoryPath) !== params.directoryPath
  ) throw new Error('CONTROLLED_BOOTSTRAP_DIRECTORY_REFUSED')
}

function ensureCanonicalDestinationDirectory(): void {
  const controlledParents = [
    '/home/w11/.config/uygunayakkabi',
    CONTROLLED_FRESH_CANDIDATE_SECRET_SOURCE_DIRECTORY,
  ]
  for (const directoryPath of controlledParents) {
    if (!existsSync(directoryPath)) {
      mkdirSync(directoryPath, { mode: 0o700 })
      fsyncDirectory(path.dirname(directoryPath), false)
    }
    assertPrivateDestinationDirectory({ directoryPath })
  }
}

function serializeSecrets(values: Record<ControlledFreshCandidatePersistentSecretName, string>): Buffer {
  const text = `${CONTROLLED_FRESH_CANDIDATE_PERSISTENT_SECRET_ALLOWLIST
    .map((name) => `${name}=${values[name]}`)
    .join('\n')}\n`
  return Buffer.from(text, 'utf8')
}

export async function bootstrapControlledFreshCandidateSecrets(
  options: ControlledFreshCandidateBootstrapOptions,
): Promise<ControlledFreshCandidateBootstrapReport> {
  let temporaryCreated = false
  let finalLinked = false
  let fileHandle: number | null = null
  let authorizationKey: Buffer | null = null
  let receiptKey: Buffer | null = null
  try {
    assertLinux()
    if (!options.interactive) return report('REFUSED')
    if (!controlledFreshCandidateExternalSecretsAreValid(options.providedSecrets)) return report('REFUSED')
    const destinationPath = options.testOnlyDestinationPath ?? CONTROLLED_FRESH_CANDIDATE_SECRET_SOURCE_PATH
    if (options.testOnlyDestinationPath === undefined) ensureCanonicalDestinationDirectory()
    const directoryPath = path.dirname(destinationPath)
    assertPrivateDestinationDirectory({
      directoryPath,
      observedFilesystemType: options.testOnlyObservedFilesystemType,
      expectedUid: options.testOnlyExpectedUid,
      expectedGid: options.testOnlyExpectedGid,
    })
    if (existsSync(destinationPath) || readdirSync(directoryPath).length !== 0) return report('REFUSED')

    const generate = options.randomBytesFn ?? randomBytes
    authorizationKey = generate(32)
    receiptKey = generate(32)
    if (
      authorizationKey.byteLength !== 32
      || receiptKey.byteLength !== 32
      || timingSafeEqual(authorizationKey, receiptKey)
    ) return report('REFUSED')
    const values = Object.create(null) as Record<ControlledFreshCandidatePersistentSecretName, string>
    values[CONTROLLED_FRESH_CANDIDATE_AUTHORIZATION_KEY_ENV] = authorizationKey.toString('base64')
    values[CONTROLLED_FRESH_CANDIDATE_RECEIPT_KEY_ENV] = receiptKey.toString('base64')
    values.DATABASE_URI = options.providedSecrets.DATABASE_URI
    values.PAYLOAD_SECRET = options.providedSecrets.PAYLOAD_SECRET
    values.BLOB_READ_WRITE_TOKEN = options.providedSecrets.BLOB_READ_WRITE_TOKEN
    const bytes = serializeSecrets(values)
    const temporaryPath = path.join(
      directoryPath,
      `.runtime-secrets.env.bootstrap-${randomBytes(16).toString('hex')}`,
    )
    fileHandle = openSync(
      temporaryPath,
      fsConstants.O_WRONLY
        | fsConstants.O_CREAT
        | fsConstants.O_EXCL
        | fsConstants.O_NOFOLLOW,
      0o600,
    )
    temporaryCreated = true
    const opened = fstatSync(fileHandle, { bigint: true })
    if (
      !opened.isFile()
      || opened.uid !== BigInt(options.testOnlyExpectedUid ?? process.getuid!())
      || opened.gid !== BigInt(options.testOnlyExpectedGid ?? process.getgid!())
      || (opened.mode & 0o777n) !== 0o600n
      || opened.nlink !== 1n
    ) throw new Error('CONTROLLED_BOOTSTRAP_FILE_REFUSED')
    let offset = 0
    while (offset < bytes.byteLength) {
      const limit = options.testOnlyFault === 'after-partial-write'
        ? Math.max(1, Math.floor(bytes.byteLength / 2))
        : bytes.byteLength
      const count = writeSync(fileHandle, bytes, offset, limit - offset, offset)
      if (count < 1) throw new Error('CONTROLLED_BOOTSTRAP_WRITE_UNCERTAIN')
      offset += count
      if (options.testOnlyFault === 'after-partial-write' && offset >= limit) {
        throw new Error('CONTROLLED_BOOTSTRAP_WRITE_UNCERTAIN')
      }
    }
    if (options.testOnlyFault === 'file-fsync') throw new Error('CONTROLLED_BOOTSTRAP_DURABILITY_UNCERTAIN')
    fsyncSync(fileHandle)
    closeSync(fileHandle)
    fileHandle = null
    await options.testOnlyBeforeFinalLink?.()
    linkSync(temporaryPath, destinationPath)
    finalLinked = true
    if (options.testOnlyFault === 'after-final-link') throw new Error('CONTROLLED_BOOTSTRAP_DURABILITY_UNCERTAIN')
    fsyncDirectory(directoryPath, options.testOnlyFault === 'directory-fsync')
    unlinkSync(temporaryPath)
    temporaryCreated = false
    fsyncDirectory(directoryPath, false)
    const verified = readControlledFreshCandidatePersistentSecrets({
      testOnlySecretPath: destinationPath,
      testOnly: {
        observedFilesystemType: options.testOnlyObservedFilesystemType,
        expectedUid: options.testOnlyExpectedUid,
        expectedGid: options.testOnlyExpectedGid,
      },
    })
    if (Object.keys(verified).length !== CONTROLLED_FRESH_CANDIDATE_PERSISTENT_SECRET_ALLOWLIST.length) {
      throw new Error('CONTROLLED_BOOTSTRAP_VERIFICATION_UNCERTAIN')
    }
    return report('CREATED', { secretFileCreated: true, keysIndependent: true, durable: true })
  } catch {
    return report(temporaryCreated || finalLinked ? 'RECOVERY_REQUIRED' : 'REFUSED')
  } finally {
    if (fileHandle !== null) {
      try { closeSync(fileHandle) } catch { /* uncertainty is reflected by the report */ }
    }
    authorizationKey?.fill(0)
    receiptKey?.fill(0)
  }
}

export function parseControlledFreshCandidateBootstrapArgs(argv: readonly string[]):
  | { ok: true; help: true }
  | { ok: true; help: false }
  | { ok: false } {
  if (argv.length === 1 && argv[0] === '--help') return { ok: true, help: true }
  if (
    argv.length === 2
    && new Set(argv).size === 2
    && argv.includes('--bootstrap')
    && argv.includes(CONTROLLED_FRESH_CANDIDATE_BOOTSTRAP_CONFIRMATION)
  ) return { ok: true, help: false }
  return { ok: false }
}

function usage(): string {
  return [
    'Controlled Fresh Candidate Secret Bootstrap',
    '',
    `  --bootstrap ${CONTROLLED_FRESH_CANDIDATE_BOOTSTRAP_CONFIRMATION}`,
    '  --help',
    '',
    'Linux/WSL interactive TTY only. Existing or uncertain state is never replaced.',
  ].join('\n')
}

async function readNoEcho(promptStatus: string): Promise<string> {
  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== 'function') {
    throw new Error('CONTROLLED_BOOTSTRAP_TTY_REQUIRED')
  }
  process.stderr.write(`${promptStatus}\n`)
  return await new Promise<string>((resolve, reject) => {
    const bytes: number[] = []
    const finish = (error?: Error) => {
      process.stdin.off('data', onData)
      process.stdin.setRawMode(false)
      process.stdin.pause()
      process.stderr.write('\n')
      if (error) reject(error)
      else resolve(Buffer.from(bytes).toString('utf8'))
    }
    const onData = (chunk: Buffer | string) => {
      for (const byte of Buffer.from(chunk)) {
        if (byte === 3) return finish(new Error('CONTROLLED_BOOTSTRAP_CANCELLED'))
        if (byte === 10 || byte === 13) return finish()
        if (byte === 8 || byte === 127) bytes.pop()
        else bytes.push(byte)
      }
    }
    process.stdin.setRawMode(true)
    process.stdin.resume()
    process.stdin.on('data', onData)
  })
}

async function runMain(): Promise<number> {
  const decision = parseControlledFreshCandidateBootstrapArgs(process.argv.slice(2))
  if (decision.ok && decision.help) {
    console.log(usage())
    return 0
  }
  if (!decision.ok) {
    console.log(JSON.stringify(report('REFUSED')))
    return 2
  }
  if (!process.stdin.isTTY) {
    console.log(JSON.stringify(report('REFUSED')))
    return 2
  }
  try {
    const result = await bootstrapControlledFreshCandidateSecrets({
      interactive: true,
      providedSecrets: {
        DATABASE_URI: await readNoEcho('CONTROLLED_BOOTSTRAP_SECRET_INPUT_REQUIRED_1'),
        PAYLOAD_SECRET: await readNoEcho('CONTROLLED_BOOTSTRAP_SECRET_INPUT_REQUIRED_2'),
        BLOB_READ_WRITE_TOKEN: await readNoEcho('CONTROLLED_BOOTSTRAP_SECRET_INPUT_REQUIRED_3'),
      },
    })
    console.log(JSON.stringify(result))
    return result.status === 'CREATED' ? 0 : 3
  } catch {
    console.log(JSON.stringify(report('REFUSED')))
    return 3
  }
}

const isMain = process.argv[1]
  ? import.meta.url === pathToFileURL(process.argv[1]).href
  : false

if (isMain) {
  process.exitCode = 1
  void runMain()
    .then((exitCode) => { process.exitCode = exitCode })
    .catch(() => { process.exitCode = 1 })
}
