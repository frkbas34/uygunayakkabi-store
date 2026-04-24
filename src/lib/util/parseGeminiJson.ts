/**
 * parseGeminiJson.ts — shared helper (D-226, extracted from D-224)
 *
 * Defensive JSON extraction for Gemini API text responses. Identical behaviour
 * to the D-224 helper inside `src/lib/geobotRuntime.ts` (which remains the
 * canonical copy for the GeoBot bridge). Kept as a standalone module so the
 * PI Bot vision call can reuse the same defensive pattern without importing
 * from the bridge module.
 *
 * Handles three real-world failure modes observed in production:
 *   1. Bare JSON (happy path) — JSON.parse works on trimmed input.
 *   2. Markdown-fenced JSON (```json ... ```) — despite responseMimeType
 *      being 'application/json', some safety-filtered or fallback responses
 *      arrive wrapped in fences.
 *   3. Trailing prose / truncated tail — extract the largest balanced {...}
 *      by scanning depth; if that still fails we throw with finishReason
 *      surfaced so the caller knows whether to bump the token budget or
 *      treat the response as structurally broken.
 *
 * The function NEVER silently returns null on parse failure — it either
 * returns a parsed object or throws a descriptive Error. Callers decide
 * whether to fail-soft (PI vision) or propagate (GeoBot discovery pack).
 */
export function parseGeminiJson<T = any>(
  raw: string,
  finishReason: string | null,
  label: string,
): T {
  // 1) Strip BOM and common markdown fences
  let cleaned = raw.trim()
  if (cleaned.startsWith('\uFEFF')) cleaned = cleaned.slice(1)
  const fenceMatch = cleaned.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
  if (fenceMatch) cleaned = fenceMatch[1].trim()

  // 2) Try a direct parse first (happy path for responseMimeType=application/json)
  try {
    return JSON.parse(cleaned) as T
  } catch {
    // fall through to balanced-brace extraction
  }

  // 3) Extract the largest balanced {...} by scanning depth (handles trailing garbage)
  const start = cleaned.indexOf('{')
  if (start >= 0) {
    let depth = 0
    let inStr = false
    let escape = false
    for (let i = start; i < cleaned.length; i++) {
      const ch = cleaned[i]
      if (escape) {
        escape = false
        continue
      }
      if (ch === '\\') {
        escape = true
        continue
      }
      if (ch === '"') {
        inStr = !inStr
        continue
      }
      if (inStr) continue
      if (ch === '{') depth++
      else if (ch === '}') {
        depth--
        if (depth === 0) {
          const candidate = cleaned.slice(start, i + 1)
          try {
            return JSON.parse(candidate) as T
          } catch {
            break
          }
        }
      }
    }
  }

  // 4) Fail truthfully — include finishReason so truncation is diagnosable
  const reasonSuffix = finishReason ? ` finishReason=${finishReason}` : ''
  const preview = cleaned.slice(0, 200).replace(/\s+/g, ' ')
  throw new Error(
    `${label}: Gemini response is not valid JSON (length=${cleaned.length}${reasonSuffix}) preview="${preview}"`,
  )
}
