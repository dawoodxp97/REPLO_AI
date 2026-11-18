import { describe, expect, it } from 'vitest'
import { orderTotal, withTax } from '../src/services/pricing'

describe('order pricing', () => {
  it('adds the line totals', () => {
    expect(orderTotal([{ product: { id: 'p', name: 'Pen', priceCents: 250, stock: 3 }, quantity: 2 }])).toBe(500)
  })

  it('applies tax', () => {
    expect(withTax(1000, 0.21)).toBe(1210)
  })
})
