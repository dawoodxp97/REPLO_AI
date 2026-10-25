import { describe, expect, it } from 'vitest'
import { blobOf, fixtureIndex } from '../../../test/grounding'
import { normalisePath, refIdFor, resolveEvidence } from './evidence'

describe('normalisePath', () => {
  it('strips leading ./ and /', () => {
    expect(normalisePath('./src/cart.ts')).toBe('src/cart.ts')
    expect(normalisePath('/src/cart.ts')).toBe('src/cart.ts')
  })

  it('rejects traversal, backslashes and empty segments', () => {
    expect(normalisePath('../secret.ts')).toBeUndefined()
    expect(normalisePath('src/../../x.ts')).toBeUndefined()
    expect(normalisePath('src\\cart.ts')).toBeUndefined()
    expect(normalisePath('src//cart.ts')).toBeUndefined()
    expect(normalisePath('  ')).toBeUndefined()
  })
})

describe('resolveEvidence', () => {
  it('resolves a symbol key to its line range and blob sha', async () => {
    const index = fixtureIndex()
    await index.load(['src/cart.ts'])
    expect(resolveEvidence(index, { path: 'src/cart.ts', symbol: 'src/cart.ts#loadCart' })).toEqual(
      {
        ok: true,
        ref: {
          path: 'src/cart.ts',
          startLine: 7,
          endLine: 9,
          blobSha: blobOf('src/cart.ts'),
          symbolKey: 'src/cart.ts#loadCart',
        },
      },
    )
  })

  it('falls back to a symbol name inside the same file', async () => {
    const index = fixtureIndex()
    await index.load(['src/cart.ts'])
    const result = resolveEvidence(index, { path: 'src/cart.ts', symbol: 'loadCart' })
    expect(result.ok && result.ref.symbolKey).toBe('src/cart.ts#loadCart')
  })

  it('narrows a quote to its line inside the symbol', async () => {
    const index = fixtureIndex()
    await index.load(['src/cart.ts'])
    const result = resolveEvidence(index, {
      path: 'src/cart.ts',
      symbol: 'addToCart',
      quote: 'items.push(item)',
    })
    expect(result).toMatchObject({ ok: true, ref: { startLine: 3, endLine: 3 } })
  })

  it('refuses a symbol that lives in another file', async () => {
    const index = fixtureIndex()
    await index.load(['src/api/routes.ts'])
    expect(resolveEvidence(index, { path: 'src/api/routes.ts', symbol: 'addToCart' })).toEqual({
      ok: false,
      reason: 'SYMBOL_NOT_FOUND',
    })
  })

  it('reports each refusal reason', async () => {
    const index = fixtureIndex()
    await index.load(['src/cart.ts'])
    expect(resolveEvidence(index, { path: 'src/nope.ts', quote: 'anything here' })).toEqual({
      ok: false,
      reason: 'PATH_NOT_FOUND',
    })
    expect(resolveEvidence(index, { path: 'src/cart.ts' })).toEqual({
      ok: false,
      reason: 'NO_ANCHOR',
    })
    expect(
      resolveEvidence(index, { path: 'src/cart.ts', quote: 'not in this file at all' }),
    ).toEqual({
      ok: false,
      reason: 'QUOTE_NOT_FOUND',
    })
  })

  it('resolves a ./ path once the file is loaded', async () => {
    const index = fixtureIndex()
    await index.load(['./src/cart.ts'])
    expect(resolveEvidence(index, { path: './src/cart.ts', symbol: 'loadCart' })).toMatchObject({
      ok: true,
      ref: { path: 'src/cart.ts', startLine: 7, endLine: 9 },
    })
  })

  it('refuses text the index never loaded', () => {
    const index = fixtureIndex()
    expect(resolveEvidence(index, { path: 'src/cart.ts', symbol: 'loadCart' })).toEqual({
      ok: false,
      reason: 'NOT_TEXT',
    })
  })

  it('derives a stable reference id from the range', async () => {
    const index = fixtureIndex()
    await index.load(['src/cart.ts'])
    const result = resolveEvidence(index, { path: 'src/cart.ts', symbol: 'loadCart' })
    if (!result.ok) throw new Error('expected a resolved reference')
    expect(refIdFor(result.ref)).toMatch(/^r_[0-9a-f]{12}$/)
    expect(refIdFor(result.ref)).toBe(refIdFor({ ...result.ref }))
  })
})
