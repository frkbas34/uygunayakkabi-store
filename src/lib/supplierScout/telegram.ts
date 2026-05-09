/**
 * supplierScout/telegram.ts
 *
 * Telegram API helpers for SupplierScout bot.
 * Uses SUPPLIER_SCOUT_BOT_TOKEN env var — completely separate from
 * TELEGRAM_BOT_TOKEN (Uygunops) and GEOBOT_TOKEN (GeoBot).
 *
 * STATUS: IMPLEMENTED (D-278)
 */

const SCOUT_TOKEN = () => process.env.SUPPLIER_SCOUT_BOT_TOKEN ?? ''

/** Send a plain text message. */
export async function scoutSendMessage(
  chatId: number,
  text: string,
  keyboard?: Array<Array<{ text: string; callback_data: string }>>,
): Promise<number | null> {
  const token = SCOUT_TOKEN()
  if (!token) {
    console.warn('[SupplierScout/telegram] SUPPLIER_SCOUT_BOT_TOKEN not set')
    return null
  }

  const safeText = text.length > 4000
    ? text.substring(0, 4000) + '\n\n⚠️ (mesaj kesildi)'
    : text

  const body: Record<string, unknown> = {
    chat_id: chatId,
    text: safeText,
    parse_mode: 'HTML',
  }
  if (keyboard) body.reply_markup = { inline_keyboard: keyboard }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const err = await res.text()
      console.error(`[SupplierScout/telegram] sendMessage FAILED ${res.status}: ${err.substring(0, 200)}`)
      return null
    }
    const data = await res.json()
    return (data as any).result?.message_id ?? null
  } catch (err) {
    console.error('[SupplierScout/telegram] sendMessage error:', err)
    return null
  }
}

/** Answer a callback query (prevents spinner in Telegram UI). */
export async function scoutAnswerCallback(callbackQueryId: string, text?: string): Promise<void> {
  const token = SCOUT_TOKEN()
  if (!token) return
  try {
    await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
    })
  } catch { /* non-critical */ }
}

/** Get file info from Telegram to build download URL. */
export async function scoutGetFileUrl(fileId: string): Promise<string | null> {
  const token = SCOUT_TOKEN()
  if (!token) return null
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`)
    if (!res.ok) return null
    const data = await res.json()
    const filePath = (data as any).result?.file_path
    if (!filePath) return null
    return `https://api.telegram.org/file/bot${token}/${filePath}`
  } catch {
    return null
  }
}

/** Download a Telegram photo as ArrayBuffer. */
export async function scoutDownloadPhoto(fileId: string): Promise<ArrayBuffer | null> {
  const url = await scoutGetFileUrl(fileId)
  if (!url) return null
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    return await res.arrayBuffer()
  } catch {
    return null
  }
}

/** Register webhook for SupplierScout bot. */
export async function registerScoutWebhook(webhookUrl: string): Promise<boolean> {
  const token = SCOUT_TOKEN()
  if (!token) return false
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        secret_token: process.env.SUPPLIER_SCOUT_WEBHOOK_SECRET ?? '',
        allowed_updates: ['message', 'callback_query'],
      }),
    })
    const data = await res.json()
    console.log('[SupplierScout/telegram] setWebhook result:', JSON.stringify(data))
    return (data as any).ok === true
  } catch (err) {
    console.error('[SupplierScout/telegram] registerWebhook error:', err)
    return false
  }
}
