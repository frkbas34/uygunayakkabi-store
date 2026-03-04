export type ProductData = {
  sku: string
  title: string
  price: number
  category?: string
  brand?: string
  sizes: Record<string, number>
  description?: string
  postToInstagram: boolean
}

export type StockUpdate = {
  sku: string
  changes: Array<{ size: string; delta: number }>
}

/**
 * Parse a Telegram caption into structured product data.
 *
 * Expected format:
 * SKU: UA-000123
 * TITLE: Nike Air Max
 * PRICE: 1499
 * CATEGORY: Sneaker
 * BRAND: Nike
 * SIZES: 36=1, 37=2, 38=2
 * DESC: Optional description
 * IG: yes/no
 */
export function parseTelegramCaption(caption: string): ProductData | null {
  if (!caption) return null

  const lines = caption.split('\n').map((l) => l.trim())
  const fields: Record<string, string> = {}

  for (const line of lines) {
    const colonIdx = line.indexOf(':')
    if (colonIdx === -1) continue
    const key = line.slice(0, colonIdx).trim().toUpperCase()
    const value = line.slice(colonIdx + 1).trim()
    fields[key] = value
  }

  const sku = fields['SKU']
  const title = fields['TITLE']
  const priceStr = fields['PRICE']

  if (!sku || !title || !priceStr) return null

  const price = parseFloat(priceStr)
  if (isNaN(price) || price <= 0) return null

  const sizes: Record<string, number> = {}
  if (fields['SIZES']) {
    const sizeParts = fields['SIZES'].split(',')
    for (const part of sizeParts) {
      const [sizeStr, stockStr] = part.trim().split('=')
      if (sizeStr && stockStr) {
        const stock = parseInt(stockStr.trim(), 10)
        if (!isNaN(stock) && stock >= 0) {
          sizes[sizeStr.trim()] = stock
        }
      }
    }
  }

  return {
    sku: sku.trim(),
    title: title.trim(),
    price,
    category: fields['CATEGORY']?.trim(),
    brand: fields['BRAND']?.trim(),
    sizes,
    description: fields['DESC']?.trim(),
    postToInstagram: fields['IG']?.toLowerCase() === 'yes',
  }
}

/**
 * Parse a Telegram stock update command.
 *
 * Expected format:
 * STOCK SKU: UA-000123
 * 38 +1
 * 40 -1
 */
export function parseStockUpdate(text: string): StockUpdate | null {
  if (!text) return null

  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  if (lines.length < 2) return null

  const firstLine = lines[0]
  const skuMatch = firstLine.match(/^STOCK SKU:\s*(.+)$/i)
  if (!skuMatch) return null

  const sku = skuMatch[1].trim()
  const changes: Array<{ size: string; delta: number }> = []

  for (let i = 1; i < lines.length; i++) {
    const match = lines[i].match(/^(\S+)\s+([+-]\d+)$/)
    if (match) {
      const size = match[1]
      const delta = parseInt(match[2], 10)
      if (!isNaN(delta)) {
        changes.push({ size, delta })
      }
    }
  }

  if (changes.length === 0) return null

  return { sku, changes }
}
