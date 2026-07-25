import type { AutomationSettingsSnapshot } from './automationDecision'

type EnvLike = Record<string, string | undefined>

export type MetaProviderCredentials = {
  accessToken: string | null
  instagramUserId: string | null
  facebookPageId: string | null
}

function normalizedValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

/**
 * Resolve the Meta values used by both direct publishing and provider health.
 *
 * Facebook Page ID intentionally lives in INSTAGRAM_PAGE_ID because the
 * AutomationSettings schema no longer persists facebookPageId. The legacy
 * snapshot value remains supported for existing in-memory callers and tests.
 */
export function resolveMetaProviderCredentials(
  settings: Pick<AutomationSettingsSnapshot, 'instagramTokens'> | null | undefined,
  env: EnvLike = process.env,
): MetaProviderCredentials {
  const instagramTokens = settings?.instagramTokens

  return {
    accessToken: normalizedValue(instagramTokens?.accessToken),
    instagramUserId: normalizedValue(instagramTokens?.userId),
    facebookPageId:
      normalizedValue(instagramTokens?.facebookPageId) ?? normalizedValue(env.INSTAGRAM_PAGE_ID),
  }
}
