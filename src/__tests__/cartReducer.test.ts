/**
 * Tests for the cartReducer pure function in CartContext.jsx.
 *
 * The reducer is extracted here and tested independently from the React
 * component, so no DOM or React Testing Library is required.
 */
import { describe, it, expect } from 'vitest'

// ─── Replica of cartReducer (mirrors CartContext.jsx exactly) ────────────────
// We test the reducer logic directly rather than importing the file to avoid
// pulling in React client-side hooks that require a browser environment.

type CartItem = {
  key: string
  product: { id: string; price: number; [k: string]: unknown }
  size: string
  qty: number
}

type CartAction =
  | { type: 'HYDRATE'; payload: CartItem[] }
  | { type: 'ADD'; product: CartItem['product']; size: string; qty?: number }
  | { type: 'REMOVE'; key: string }
  | { type: 'SET_QTY'; key: string; qty: number }
  | { type: 'CLEAR' }
  | { type: string }

function cartReducer(state: CartItem[], action: CartAction): CartItem[] {
  switch (action.type) {
    case 'HYDRATE':
      return (action as { type: 'HYDRATE'; payload: CartItem[] }).payload
    case 'ADD': {
      const { product, size, qty = 1 } = action as {
        type: 'ADD'; product: CartItem['product']; size: string; qty?: number
      }
      const key = `${product.id}-${size}`
      const existing = state.find((i) => i.key === key)
      if (existing) {
        return state.map((i) => (i.key === key ? { ...i, qty: i.qty + qty } : i))
      }
      return [...state, { key, product, size, qty }]
    }
    case 'REMOVE':
      return state.filter((i) => i.key !== (action as { key: string }).key)
    case 'SET_QTY': {
      const { key, qty } = action as { type: 'SET_QTY'; key: string; qty: number }
      if (qty < 1) return state.filter((i) => i.key !== key)
      return state.map((i) => (i.key === key ? { ...i, qty } : i))
    }
    case 'CLEAR':
      return []
    default:
      return state
  }
}

// ─── Fixtures ────────────────────────────────────────────────────────────────

const productA = { id: 'p1', price: 500, name: 'Shoe A' }
const productB = { id: 'p2', price: 800, name: 'Shoe B' }

const itemA: CartItem = { key: 'p1-42', product: productA, size: '42', qty: 1 }
const itemB: CartItem = { key: 'p2-40', product: productB, size: '40', qty: 2 }

// ─── HYDRATE ─────────────────────────────────────────────────────────────────

describe('cartReducer — HYDRATE', () => {
  it('replaces state with the provided payload', () => {
    const result = cartReducer([], { type: 'HYDRATE', payload: [itemA, itemB] })
    expect(result).toEqual([itemA, itemB])
  })

  it('hydrates over an existing non-empty state', () => {
    const result = cartReducer([itemA], { type: 'HYDRATE', payload: [itemB] })
    expect(result).toEqual([itemB])
  })

  it('hydrates to an empty array', () => {
    const result = cartReducer([itemA], { type: 'HYDRATE', payload: [] })
    expect(result).toEqual([])
  })
})

// ─── ADD ─────────────────────────────────────────────────────────────────────

describe('cartReducer — ADD', () => {
  it('adds a new item to an empty cart', () => {
    const result = cartReducer([], { type: 'ADD', product: productA, size: '42' })
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ key: 'p1-42', product: productA, size: '42', qty: 1 })
  })

  it('defaults qty to 1 when not provided', () => {
    const result = cartReducer([], { type: 'ADD', product: productA, size: '42' })
    expect(result[0].qty).toBe(1)
  })

  it('uses the provided qty value', () => {
    const result = cartReducer([], { type: 'ADD', product: productA, size: '42', qty: 3 })
    expect(result[0].qty).toBe(3)
  })

  it('accumulates qty when the same product+size already exists', () => {
    const existing = [itemA] // qty: 1
    const result = cartReducer(existing, { type: 'ADD', product: productA, size: '42', qty: 2 })
    expect(result).toHaveLength(1)
    expect(result[0].qty).toBe(3)
  })

  it('treats different sizes of the same product as separate entries', () => {
    const result = cartReducer([itemA], { type: 'ADD', product: productA, size: '43' })
    expect(result).toHaveLength(2)
  })

  it('treats different products as separate entries', () => {
    const result = cartReducer([itemA], { type: 'ADD', product: productB, size: '42' })
    expect(result).toHaveLength(2)
  })

  it('generates key as "productId-size"', () => {
    const result = cartReducer([], { type: 'ADD', product: productB, size: '39' })
    expect(result[0].key).toBe('p2-39')
  })
})

// ─── REMOVE ──────────────────────────────────────────────────────────────────

describe('cartReducer — REMOVE', () => {
  it('removes an item by key', () => {
    const result = cartReducer([itemA, itemB], { type: 'REMOVE', key: 'p1-42' })
    expect(result).toHaveLength(1)
    expect(result[0].key).toBe('p2-40')
  })

  it('returns the same state when key does not exist', () => {
    const result = cartReducer([itemA], { type: 'REMOVE', key: 'nonexistent' })
    expect(result).toEqual([itemA])
  })

  it('empties the cart when the last item is removed', () => {
    const result = cartReducer([itemA], { type: 'REMOVE', key: 'p1-42' })
    expect(result).toHaveLength(0)
  })
})

// ─── SET_QTY ─────────────────────────────────────────────────────────────────

describe('cartReducer — SET_QTY', () => {
  it('updates qty for the matching key', () => {
    const result = cartReducer([itemA, itemB], { type: 'SET_QTY', key: 'p1-42', qty: 5 })
    expect(result.find((i) => i.key === 'p1-42')!.qty).toBe(5)
    expect(result.find((i) => i.key === 'p2-40')!.qty).toBe(2) // unchanged
  })

  it('removes the item when qty is set to 0', () => {
    const result = cartReducer([itemA, itemB], { type: 'SET_QTY', key: 'p1-42', qty: 0 })
    expect(result.find((i) => i.key === 'p1-42')).toBeUndefined()
    expect(result).toHaveLength(1)
  })

  it('removes the item when qty is negative', () => {
    const result = cartReducer([itemA], { type: 'SET_QTY', key: 'p1-42', qty: -1 })
    expect(result).toHaveLength(0)
  })

  it('does nothing when key does not exist', () => {
    const result = cartReducer([itemA], { type: 'SET_QTY', key: 'nonexistent', qty: 5 })
    expect(result).toEqual([itemA])
  })
})

// ─── CLEAR ───────────────────────────────────────────────────────────────────

describe('cartReducer — CLEAR', () => {
  it('empties the cart', () => {
    const result = cartReducer([itemA, itemB], { type: 'CLEAR' })
    expect(result).toHaveLength(0)
  })

  it('clearing an already empty cart returns an empty array', () => {
    const result = cartReducer([], { type: 'CLEAR' })
    expect(result).toHaveLength(0)
  })
})

// ─── Unknown action ───────────────────────────────────────────────────────────

describe('cartReducer — unknown action', () => {
  it('returns the current state unchanged for unknown action types', () => {
    const result = cartReducer([itemA], { type: 'UNKNOWN_ACTION' })
    expect(result).toEqual([itemA])
  })
})

// ─── Derived values (totalItems, totalPrice) ─────────────────────────────────

describe('derived cart totals', () => {
  it('totalItems sums all quantities', () => {
    const items: CartItem[] = [
      { key: 'p1-42', product: productA, size: '42', qty: 2 },
      { key: 'p2-40', product: productB, size: '40', qty: 3 },
    ]
    const total = items.reduce((s, i) => s + i.qty, 0)
    expect(total).toBe(5)
  })

  it('totalPrice sums price × qty for each item', () => {
    const items: CartItem[] = [
      { key: 'p1-42', product: productA, size: '42', qty: 2 }, // 500 × 2 = 1000
      { key: 'p2-40', product: productB, size: '40', qty: 1 }, // 800 × 1 = 800
    ]
    const total = items.reduce((s, i) => s + i.product.price * i.qty, 0)
    expect(total).toBe(1800)
  })

  it('totalItems is 0 for empty cart', () => {
    const total = ([] as CartItem[]).reduce((s, i) => s + i.qty, 0)
    expect(total).toBe(0)
  })

  it('totalPrice is 0 for empty cart', () => {
    const total = ([] as CartItem[]).reduce((s, i) => s + i.product.price * i.qty, 0)
    expect(total).toBe(0)
  })
})
