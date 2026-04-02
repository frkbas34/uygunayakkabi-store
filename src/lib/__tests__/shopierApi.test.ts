import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  listCategories,
  createCategory,
  listVariations,
  listSelections,
  createSelection,
  listWebhooks,
  createWebhook,
  deleteWebhook,
  type ShopierCreateProductBody,
} from '../shopierApi'

// ─── Helpers ──────────────────────────────────────────────────────────────

function makeFetchResponse(status: number, body: unknown, headers: Record<string, string> = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : status === 204 ? 'No Content' : status === 429 ? 'Too Many Requests' : 'Error',
    headers: {
      get: (key: string) => headers[key.toLowerCase()] ?? null,
    },
    json: vi.fn().mockResolvedValue(body),
    text: vi.fn().mockResolvedValue(typeof body === 'string' ? body : JSON.stringify(body)),
  }
}

// ─── Setup / teardown ─────────────────────────────────────────────────────

beforeEach(() => {
  process.env.SHOPIER_PAT = 'test-pat-token'
  vi.stubGlobal('fetch', vi.fn())
})

afterEach(() => {
  delete process.env.SHOPIER_PAT
  vi.unstubAllGlobals()
})

// ─── PAT environment variable ─────────────────────────────────────────────

describe('SHOPIER_PAT validation', () => {
  it('throws when SHOPIER_PAT is not set', async () => {
    delete process.env.SHOPIER_PAT
    await expect(listProducts()).rejects.toThrow('SHOPIER_PAT env var is not set')
  })

  it('throws when SHOPIER_PAT is empty string', async () => {
    process.env.SHOPIER_PAT = '   '
    await expect(listProducts()).rejects.toThrow('SHOPIER_PAT env var is not set')
  })
})

// ─── Successful responses ─────────────────────────────────────────────────

describe('listProducts', () => {
  it('returns ok:true with parsed data on 200', async () => {
    const mockData = [{ id: '1', title: 'Test Product' }]
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(200, mockData) as unknown as Response)

    const result = await listProducts()
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data).toEqual(mockData)
    }
  })

  it('calls the correct endpoint with default params', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(200, []) as unknown as Response)

    await listProducts()
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/products?limit=10&page=1'),
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('passes custom limit and page', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(200, []) as unknown as Response)

    await listProducts(25, 3)
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/products?limit=25&page=3'),
      expect.anything(),
    )
  })

  it('sends Authorization header', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(200, []) as unknown as Response)

    await listProducts()
    expect(fetch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-pat-token',
        }),
      }),
    )
  })
})

describe('getProduct', () => {
  it('fetches a single product by id', async () => {
    const mockProduct = { id: 'p123', title: 'Nike Air Max' }
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(200, mockProduct) as unknown as Response)

    const result = await getProduct('p123')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data).toEqual(mockProduct)
    }
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/products/p123'),
      expect.objectContaining({ method: 'GET' }),
    )
  })
})

describe('createProduct', () => {
  const body: ShopierCreateProductBody = {
    title: 'Nike Air Max 90',
    type: 'physical',
    media: [{ url: 'https://example.com/img.jpg', type: 'image', placement: 1 }],
    priceData: { currency: 'TRY', price: '2199' },
    shippingPayer: 'buyerPays',
  }

  it('sends a POST request with JSON body', async () => {
    const created = { id: 'new-1', ...body }
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(200, created) as unknown as Response)

    const result = await createProduct(body)
    expect(result.ok).toBe(true)
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/products'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      }),
    )
  })
})

describe('updateProduct', () => {
  it('sends a PUT request to the correct product endpoint', async () => {
    const updated = { id: 'p1', title: 'Updated' }
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(200, updated) as unknown as Response)

    const result = await updateProduct('p1', { title: 'Updated' })
    expect(result.ok).toBe(true)
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/products/p1'),
      expect.objectContaining({ method: 'PUT' }),
    )
  })
})

describe('deleteProduct', () => {
  it('sends a DELETE request and returns ok:true on 204', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(204, null) as unknown as Response)

    const result = await deleteProduct('p1')
    expect(result.ok).toBe(true)
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/products/p1'),
      expect.objectContaining({ method: 'DELETE' }),
    )
  })
})

// ─── Category endpoints ────────────────────────────────────────────────────

describe('listCategories', () => {
  it('returns categories on success', async () => {
    const cats = [{ id: 'c1', title: 'Spor', placement: 1 }]
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(200, cats) as unknown as Response)

    const result = await listCategories()
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data).toEqual(cats)
  })

  it('calls correct endpoint with default limit', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(200, []) as unknown as Response)

    await listCategories()
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/categories?limit=50'),
      expect.anything(),
    )
  })
})

describe('createCategory', () => {
  it('sends title and placement in body', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeFetchResponse(200, { id: 'c2', title: 'Günlük', placement: 2 }) as unknown as Response,
    )

    await createCategory('Günlük', 2)
    expect(fetch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ method: 'POST' }),
    )
    const callArgs = vi.mocked(fetch).mock.calls[0]
    const reqBody = JSON.parse((callArgs[1] as RequestInit).body as string)
    expect(reqBody.title).toBe('Günlük')
    expect(reqBody.placement).toBe(2)
  })

  it('omits placement when not provided', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeFetchResponse(200, { id: 'c3', title: 'Bot', placement: 0 }) as unknown as Response,
    )

    await createCategory('Bot')
    const callArgs = vi.mocked(fetch).mock.calls[0]
    const reqBody = JSON.parse((callArgs[1] as RequestInit).body as string)
    expect(reqBody.placement).toBeUndefined()
  })
})

// ─── Variation / Selection endpoints ──────────────────────────────────────

describe('listVariations', () => {
  it('calls the correct endpoint', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(200, []) as unknown as Response)

    await listVariations()
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/variations'),
      expect.objectContaining({ method: 'GET' }),
    )
  })
})

describe('listSelections', () => {
  it('calls endpoint with default limit', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(200, []) as unknown as Response)

    await listSelections()
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/selections?limit=50'),
      expect.anything(),
    )
  })
})

describe('createSelection', () => {
  it('sends variationId and title', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeFetchResponse(200, { id: 's1', title: '42', variationId: 'v1' }) as unknown as Response,
    )

    await createSelection('v1', '42')
    const callArgs = vi.mocked(fetch).mock.calls[0]
    const reqBody = JSON.parse((callArgs[1] as RequestInit).body as string)
    expect(reqBody.variationId).toBe('v1')
    expect(reqBody.title).toBe('42')
  })
})

// ─── Webhook endpoints ────────────────────────────────────────────────────

describe('listWebhooks', () => {
  it('returns webhook list on success', async () => {
    const hooks = [{ id: 'w1', event: 'order.created', url: 'https://example.com/hook' }]
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(200, hooks) as unknown as Response)

    const result = await listWebhooks()
    expect(result.ok).toBe(true)
  })
})

describe('createWebhook', () => {
  it('sends event and url in body', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeFetchResponse(200, { id: 'w2', event: 'order.created', url: 'https://example.com/wh' }) as unknown as Response,
    )

    await createWebhook('order.created', 'https://example.com/wh')
    const callArgs = vi.mocked(fetch).mock.calls[0]
    const reqBody = JSON.parse((callArgs[1] as RequestInit).body as string)
    expect(reqBody.event).toBe('order.created')
    expect(reqBody.url).toBe('https://example.com/wh')
  })
})

describe('deleteWebhook', () => {
  it('sends DELETE to the correct endpoint', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(204, null) as unknown as Response)

    await deleteWebhook('w1')
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/webhooks/w1'),
      expect.objectContaining({ method: 'DELETE' }),
    )
  })
})

// ─── Error handling ────────────────────────────────────────────────────────

describe('HTTP error handling', () => {
  it('returns ok:false with status on 4xx error', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(404, 'Not Found') as unknown as Response)

    const result = await listProducts()
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.status).toBe(404)
    }
  })

  it('includes retryAfter on 429 response', async () => {
    const response = makeFetchResponse(429, 'Rate Limited', { 'retry-after': '30' })
    vi.mocked(fetch).mockResolvedValue(response as unknown as Response)

    const result = await listProducts()
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.retryAfter).toBe(30)
    }
  })

  it('returns ok:false on network error (fetch throws)', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('Network error'))

    const result = await listProducts()
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.status).toBe(0)
      expect(result.statusText).toBe('network_error')
      expect(result.body).toContain('Network error')
    }
  })

  it('handles non-Error thrown values in network error', async () => {
    vi.mocked(fetch).mockRejectedValue('some string error')

    const result = await listProducts()
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.status).toBe(0)
      expect(result.body).toContain('some string error')
    }
  })

  it('returns ok:false on 500 server error', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(500, 'Internal Server Error') as unknown as Response)

    const result = await createProduct({
      title: 'Test',
      type: 'physical',
      media: [],
      priceData: { currency: 'TRY', price: '100' },
      shippingPayer: 'buyerPays',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.status).toBe(500)
    }
  })

  it('truncates error body to 500 chars', async () => {
    const longError = 'x'.repeat(1000)
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(400, longError) as unknown as Response)

    const result = await listProducts()
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.body.length).toBeLessThanOrEqual(500)
    }
  })
})
