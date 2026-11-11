import { describe, expect, it } from 'vitest'
import { cn, TYPE_SCALE } from './cn'

describe('cn', () => {
  it.each(TYPE_SCALE)('keeps text-%s beside a text colour', (size) => {
    expect(cn(`text-${size}`, 'text-muted-foreground')).toBe(`text-${size} text-muted-foreground`)
  })

  it('lets a later size from the scale replace an earlier one', () => {
    expect(cn('text-sm', 'text-compact')).toBe('text-compact')
    expect(cn('text-compact', 'text-xs')).toBe('text-xs')
  })

  it('keeps semantic colours as colours', () => {
    expect(cn('text-observed', 'text-destructive')).toBe('text-destructive')
  })

  it('treats tracking-display as letter spacing', () => {
    expect(cn('tracking-tight', 'tracking-display')).toBe('tracking-display')
  })
})
