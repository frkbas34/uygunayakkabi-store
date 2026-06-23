import type { ReadinessLevel } from './publishReadiness'

export interface OperatorReadinessCheck {
  label: string
  ok: boolean
  warn?: boolean
}

export interface OperatorReadinessInput {
  status?: string | null
  checks: OperatorReadinessCheck[]
  readiness: {
    level: ReadinessLevel
    passedCount: number
    totalCount: number
    blockers: string[]
  }
}

export interface OperatorReadinessSummary {
  bannerState: 'published' | 'ready' | 'blocked'
  isPublished: boolean
  isReadyToPublish: boolean
  fieldBlockers: OperatorReadinessCheck[]
  warnings: OperatorReadinessCheck[]
  readinessBlockers: string[]
  readinessPassedCount: number
  readinessTotalCount: number
}

export function summarizeOperatorReadiness(input: OperatorReadinessInput): OperatorReadinessSummary {
  const fieldBlockers = input.checks.filter((check) => !check.ok && !check.warn)
  const warnings = input.checks.filter((check) => !check.ok && check.warn)
  const readinessBlockers = input.readiness.blockers
  const isPublished = input.status === 'active'
  const isReadyToPublish = !isPublished && input.readiness.level === 'ready' && fieldBlockers.length === 0

  return {
    bannerState: isPublished ? 'published' : isReadyToPublish ? 'ready' : 'blocked',
    isPublished,
    isReadyToPublish,
    fieldBlockers,
    warnings,
    readinessBlockers,
    readinessPassedCount: input.readiness.passedCount,
    readinessTotalCount: input.readiness.totalCount,
  }
}
