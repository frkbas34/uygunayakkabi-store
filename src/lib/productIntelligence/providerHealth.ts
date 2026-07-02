export type PiProviderHealthState = 'ready' | 'partial' | 'missing'

export type PiProviderHealthMode = 'direct' | 'auto' | 'selected' | 'none'

export type PiProviderHealthName =
  | 'gemini_text'
  | 'gemini_image'
  | 'google_vision'
  | 'dataforseo'
  | 'serpapi'
  | 'reverse_search'

export type PiProviderHealth = {
  name: PiProviderHealthName
  state: PiProviderHealthState
  mode: PiProviderHealthMode
  missing: string[]
  notes: string[]
}

type EnvLike = Record<string, string | undefined>

type ReversePreference = 'auto' | 'googlevision' | 'dataforseo' | 'serpapi'

const DATAFORSEO_KEYS = ['DATAFORSEO_LOGIN', 'DATAFORSEO_PASSWORD'] as const

function hasValue(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

function missingKeys(env: EnvLike, keys: readonly string[]): string[] {
  return keys.filter((key) => !hasValue(env[key]))
}

function stateFromMissing(missing: string[]): PiProviderHealthState {
  return missing.length === 0 ? 'ready' : 'missing'
}

function dataForSeoState(missing: string[]): PiProviderHealthState {
  if (missing.length === 0) return 'ready'
  if (missing.length < DATAFORSEO_KEYS.length) return 'partial'
  return 'missing'
}

function normalizeReversePreference(raw: string | undefined): {
  preference: ReversePreference
  raw: string
  unknown: boolean
} {
  const value = (raw || 'auto').trim().toLowerCase()
  if (!value || value === 'auto') return { preference: 'auto', raw: value || 'auto', unknown: false }
  if (value === 'googlevision' || value === 'google_vision' || value === 'google-vision') {
    return { preference: 'googlevision', raw: value, unknown: false }
  }
  if (value === 'dataforseo') return { preference: 'dataforseo', raw: value, unknown: false }
  if (value === 'serpapi') return { preference: 'serpapi', raw: value, unknown: false }
  return { preference: 'auto', raw: value, unknown: true }
}

function reverseProviderLabel(preference: ReversePreference): string {
  if (preference === 'googlevision') return 'Google Vision'
  if (preference === 'dataforseo') return 'DataForSEO'
  if (preference === 'serpapi') return 'SerpAPI'
  return 'auto'
}

export function evaluateProductIntelligenceProviderHealth(
  env: EnvLike = process.env,
): PiProviderHealth[] {
  const geminiMissing = missingKeys(env, ['GEMINI_API_KEY'])
  const googleMissing = missingKeys(env, ['GOOGLE_VISION_API_KEY'])
  const dataForSeoMissing = missingKeys(env, DATAFORSEO_KEYS)
  const serpMissing = missingKeys(env, ['SERPAPI_API_KEY'])

  const googleReady = googleMissing.length === 0
  const dataForSeoReady = dataForSeoMissing.length === 0
  const serpReady = serpMissing.length === 0

  const preference = normalizeReversePreference(env.REVERSE_SEARCH_PROVIDER)

  const rows: PiProviderHealth[] = [
    {
      name: 'gemini_text',
      state: stateFromMissing(geminiMissing),
      mode: geminiMissing.length === 0 ? 'direct' : 'none',
      missing: geminiMissing,
      notes: ['Used by GeoBot commerce/discovery text and PI SEO/GEO pack generation'],
    },
    {
      name: 'gemini_image',
      state: stateFromMissing(geminiMissing),
      mode: geminiMissing.length === 0 ? 'direct' : 'none',
      missing: geminiMissing,
      notes: [
        'Used by Gemini image generation',
        hasValue(env.GEMINI_IMAGE_GEN_MODEL)
          ? 'Image model override configured via GEMINI_IMAGE_GEN_MODEL'
          : 'Default image model will be used',
      ],
    },
    {
      name: 'google_vision',
      state: stateFromMissing(googleMissing),
      mode: googleMissing.length === 0 ? 'direct' : 'none',
      missing: googleMissing,
      notes: ['Reverse-image provider option; credential presence only, quota is not verified'],
    },
    {
      name: 'dataforseo',
      state: dataForSeoState(dataForSeoMissing),
      mode: dataForSeoMissing.length === 0 ? 'direct' : 'none',
      missing: dataForSeoMissing,
      notes: ['Reverse-image/text-search provider option; balance and account permissions are not verified'],
    },
    {
      name: 'serpapi',
      state: stateFromMissing(serpMissing),
      mode: serpMissing.length === 0 ? 'direct' : 'none',
      missing: serpMissing,
      notes: ['Reverse-image provider fallback option; quota is not verified'],
    },
  ]

  rows.push(buildReverseSearchRow({
    preference: preference.preference,
    rawPreference: preference.raw,
    unknownPreference: preference.unknown,
    googleReady,
    dataForSeoReady,
    serpReady,
    googleMissing,
    dataForSeoMissing,
    serpMissing,
  }))

  return rows
}

function buildReverseSearchRow(args: {
  preference: ReversePreference
  rawPreference: string
  unknownPreference: boolean
  googleReady: boolean
  dataForSeoReady: boolean
  serpReady: boolean
  googleMissing: string[]
  dataForSeoMissing: string[]
  serpMissing: string[]
}): PiProviderHealth {
  const notes: string[] = []
  if (args.unknownPreference) {
    notes.push(`Unrecognized REVERSE_SEARCH_PROVIDER=${args.rawPreference}; runtime falls back to auto order`)
  }

  if (args.preference === 'auto') {
    if (args.googleReady) {
      return {
        name: 'reverse_search',
        state: 'ready',
        mode: 'auto',
        missing: [],
        notes: [...notes, 'Auto selects Google Vision first'],
      }
    }
    if (args.dataForSeoReady) {
      return {
        name: 'reverse_search',
        state: 'ready',
        mode: 'auto',
        missing: [],
        notes: [...notes, 'Auto selects DataForSEO because Google Vision is unavailable'],
      }
    }
    if (args.serpReady) {
      return {
        name: 'reverse_search',
        state: 'ready',
        mode: 'auto',
        missing: [],
        notes: [...notes, 'Auto selects SerpAPI because Google Vision and DataForSEO are unavailable'],
      }
    }

    const anyPartialDataForSeo = args.dataForSeoMissing.length > 0 && args.dataForSeoMissing.length < DATAFORSEO_KEYS.length
    return {
      name: 'reverse_search',
      state: anyPartialDataForSeo ? 'partial' : 'missing',
      mode: 'none',
      missing: [
        ...args.googleMissing,
        ...args.dataForSeoMissing,
        ...args.serpMissing,
      ],
      notes: [...notes, 'No reverse-search provider can be selected in auto mode'],
    }
  }

  const selected = reverseProviderLabel(args.preference)
  if (args.preference === 'googlevision') {
    return {
      name: 'reverse_search',
      state: args.googleReady ? 'ready' : 'missing',
      mode: args.googleReady ? 'selected' : 'none',
      missing: args.googleMissing,
      notes: [`REVERSE_SEARCH_PROVIDER selects ${selected}`],
    }
  }
  if (args.preference === 'dataforseo') {
    return {
      name: 'reverse_search',
      state: dataForSeoState(args.dataForSeoMissing),
      mode: args.dataForSeoReady ? 'selected' : 'none',
      missing: args.dataForSeoMissing,
      notes: [`REVERSE_SEARCH_PROVIDER selects ${selected}`],
    }
  }

  return {
    name: 'reverse_search',
    state: args.serpReady ? 'ready' : 'missing',
    mode: args.serpReady ? 'selected' : 'none',
    missing: args.serpMissing,
    notes: [`REVERSE_SEARCH_PROVIDER selects ${selected}`],
  }
}

export function formatProductIntelligenceProviderHealthLine(row: PiProviderHealth): string {
  const icon = row.state === 'ready' ? 'ok' : row.state === 'partial' ? 'partial' : 'missing'
  const missing = row.missing.length > 0 ? `; missing: ${row.missing.join(', ')}` : ''
  const notes = row.notes.length > 0 ? `; ${row.notes.join('; ')}` : ''

  return `${icon} ${row.name}: ${row.state}/${row.mode}${missing}${notes}`
}
