/**
 * telegramAccess.ts — Pre-traffic hardening: Telegram DM operator allowlist.
 *
 * Private chats previously skipped the operator allowlist entirely (the Phase I
 * gate in src/app/api/telegram/route.ts covered group chats only), so anyone who
 * discovered the bot username could run every command from a DM. This module
 * holds the pure decision logic so the route can stay surgical and the behavior
 * is unit-testable without Telegram or Payload.
 *
 * Semantics deliberately MIRROR the existing group gate (route.ts Phase I):
 *   - allowedUserIds is a comma/newline separated string from
 *     AutomationSettings.telegram.allowedUserIds
 *   - a NON-EMPTY allowlist denies every sender not on it
 *   - an EMPTY allowlist keeps legacy-open behavior (no lockout for an
 *     unconfigured single-operator setup) — callers should log a loud warning
 *     so the operator knows the DM gate is open.
 */

export type TelegramDmAccess = {
  allowed: boolean
  /**
   * 'allowlisted'    — sender is on a non-empty allowlist
   * 'open-allowlist' — allowlist is empty/unset → legacy-open (warn loudly)
   * 'denied'         — non-empty allowlist and sender is not on it
   */
  reason: 'allowlisted' | 'open-allowlist' | 'denied'
}

/** Same parsing as the group gate: split on commas/newlines, trim, drop empties. */
export function parseAllowedUserIds(raw: string | null | undefined): string[] {
  return (raw || '')
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

export function evaluateTelegramDmAccess(input: {
  senderId: string | null | undefined
  allowedRaw: string | null | undefined
}): TelegramDmAccess {
  const allowedIds = parseAllowedUserIds(input.allowedRaw)
  if (allowedIds.length === 0) {
    return { allowed: true, reason: 'open-allowlist' }
  }
  const senderId = String(input.senderId || '').trim()
  if (senderId && allowedIds.includes(senderId)) {
    return { allowed: true, reason: 'allowlisted' }
  }
  return { allowed: false, reason: 'denied' }
}

/** Polite refusal for non-allowlisted DM senders (no command context leaked). */
export const DM_REFUSAL_MESSAGE =
  'Bu bot yalnızca yetkili operatörler içindir. / This bot is for authorized operators only.'
