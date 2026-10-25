import { describe, expect, it } from 'vitest'
import { blobOf, fixtureIndex } from '../../../test/grounding'
import type { LessonDraft } from '../drafts'
import { groundLesson } from './lesson'
import type { SourceIndex } from './source-index'

const draft = (overrides: Partial<LessonDraft> = {}): LessonDraft => ({
  key: 'cart-flow',
  title: 'Adding to the cart',
  minutes: 5,
  blocks: [],
  quiz: [],
  ...overrides,
})

async function ground(lesson: LessonDraft) {
  const index: SourceIndex = fixtureIndex()
  await index.load(['src/cart.ts', 'src/api/routes.ts'])
  return groundLesson(lesson, index, await index.knownIdentifiers())
}

describe('groundLesson', () => {
  it('keeps supported claims with resolved references and downgrades unsupported ones', async () => {
    const result = await ground(
      draft({
        blocks: [
          {
            type: 'prose',
            kind: 'observed',
            md: 'The `addToCart` function saves the item.',
            evidence: [{ path: 'src/cart.ts', symbol: 'addToCart' }],
          },
          {
            type: 'prose',
            kind: 'observed',
            md: 'Nothing in the repository proves this.',
            evidence: [{ path: 'src/missing.ts', quote: 'whatever text here' }],
          },
        ],
      }),
    )

    const [supported, downgraded] = result.lesson.blocks
    expect(supported).toMatchObject({ type: 'prose', kind: 'observed' })
    expect(downgraded).toMatchObject({ type: 'prose', kind: 'interpretation', evidence: [] })
    expect(result.failures.map((failure) => failure.code)).toEqual([
      'UNRESOLVED_EVIDENCE',
      'UNSUPPORTED_CLAIM',
    ])
    expect(result.claims).toEqual({ total: 2, supported: 1 })
    expect(result.references).toEqual({ total: 2, resolved: 1 })
  })

  it('removes a block that names an identifier the repository never uses', async () => {
    const result = await ground(
      draft({
        blocks: [
          {
            type: 'prose',
            kind: 'observed',
            md: 'Calls `invented.thing()` in the cart.',
            evidence: [{ path: 'src/cart.ts', symbol: 'loadCart' }],
          },
        ],
      }),
    )
    expect(result.lesson.blocks).toEqual([])
    expect(result.fabricated).toBe(1)
    expect(result.failures).toEqual([
      { code: 'FABRICATED_IDENTIFIER', location: 'block:0', detail: 'invented.thing' },
    ])
  })

  it('checks identifiers after sanitising, so a tag cannot hide one', async () => {
    const result = await ground(
      draft({
        blocks: [
          {
            type: 'prose',
            kind: 'observed',
            md: 'Calls `cart<cart></cart>items` in the cart.',
            evidence: [{ path: 'src/cart.ts', symbol: 'loadCart' }],
          },
        ],
      }),
    )
    expect(result.lesson.blocks).toEqual([])
    expect(result.failures).toEqual([
      { code: 'FABRICATED_IDENTIFIER', location: 'block:0', detail: 'cartitems' },
    ])
  })

  it('removes a block whose code span calls an invented function', async () => {
    const result = await ground(
      draft({
        blocks: [
          {
            type: 'prose',
            kind: 'observed',
            md: 'Calls `makeThing(item)` in the cart.',
            evidence: [{ path: 'src/cart.ts', symbol: 'loadCart' }],
          },
        ],
      }),
    )
    expect(result.lesson.blocks).toEqual([])
    expect(result.failures).toEqual([
      { code: 'FABRICATED_IDENTIFIER', location: 'block:0', detail: 'makeThing' },
    ])
  })

  it('checks code captions for invented identifiers', async () => {
    const result = await ground(
      draft({
        blocks: [
          {
            type: 'code',
            source: { path: 'src/cart.ts', quote: 'items.push(item)' },
            caption: 'Uses `invented.fn()`',
          },
        ],
      }),
    )
    expect(result.lesson.blocks).toEqual([])
    expect(result.failures).toEqual([
      { code: 'FABRICATED_IDENTIFIER', location: 'block:0', detail: 'invented.fn' },
    ])
  })

  it('checks diagram captions for invented identifiers', async () => {
    const result = await ground(
      draft({
        blocks: [
          {
            type: 'diagram',
            mermaid: 'flowchart LR\n  A[Route] --> B[Cart]',
            nodeRefs: { A: 'src/api/routes.ts', B: 'src/cart.ts' },
            caption: 'Calls `ghost.fn()`',
          },
        ],
      }),
    )
    expect(result.lesson.blocks).toEqual([])
    expect(result.failures).toEqual([
      { code: 'FABRICATED_IDENTIFIER', location: 'block:0', detail: 'ghost.fn' },
    ])
  })

  it('records invented identifiers in the lesson title without dropping the title', async () => {
    const result = await ground(draft({ title: 'Calls `ghost.fn()`' }))
    expect(result.lesson.title).toBe('Calls `ghost.fn()`')
    expect(result.failures).toEqual([
      { code: 'FABRICATED_IDENTIFIER', location: 'title', detail: 'ghost.fn' },
    ])
  })

  it('resolves code blocks into refs and drops unresolvable ones', async () => {
    const result = await ground(
      draft({
        blocks: [
          {
            type: 'code',
            source: { path: 'src/cart.ts', quote: 'items.push(item)' },
            caption: 'The push',
          },
          {
            type: 'code',
            source: { path: 'src/cart.ts', quote: 'deleteEverything(all)' },
            caption: 'Not real',
          },
        ],
      }),
    )
    expect(result.lesson.blocks).toHaveLength(1)
    const [code] = result.lesson.blocks
    expect(code).toMatchObject({ type: 'code', caption: 'The push' })
    expect(Object.values(result.refs)).toEqual([
      {
        path: 'src/cart.ts',
        startLine: 3,
        endLine: 3,
        blobSha: blobOf('src/cart.ts'),
      },
    ])
    expect(result.failures.map((failure) => failure.code)).toEqual(['UNRESOLVED_CODE'])
  })

  it('keeps a diagram with verified hops, drops the unverified ones and reports them', async () => {
    const result = await ground(
      draft({
        blocks: [
          {
            type: 'diagram',
            mermaid: 'flowchart LR\n  A[Route] --> B[Cart]\n  B --> A',
            nodeRefs: { A: 'src/api/routes.ts', B: 'src/cart.ts' },
            caption: 'Request flow',
          },
        ],
      }),
    )
    expect(result.lesson.blocks).toMatchObject([
      { type: 'diagram', nodeRefs: { A: 'src/api/routes.ts', B: 'src/cart.ts' } },
    ])
    expect(result.failures).toEqual([
      {
        code: 'UNVERIFIED_HOP',
        location: 'block:0',
        detail: '1 hop(s) are not edges in the file graph',
      },
    ])
  })

  it('drops a diagram that cannot be verified at all', async () => {
    const result = await ground(
      draft({
        blocks: [
          {
            type: 'diagram',
            mermaid: 'flowchart LR\n  A --> B',
            nodeRefs: { A: 'src/cart.ts', B: 'src/api/routes.ts' },
            caption: 'Wrong way round',
          },
        ],
      }),
    )
    expect(result.lesson.blocks).toEqual([])
    expect(result.failures).toEqual([
      { code: 'INVALID_DIAGRAM', location: 'block:0', detail: 'NO_VERIFIED_HOPS' },
    ])
  })

  it('keeps questions whose evidence resolves and drops the rest', async () => {
    const question = (key: string, path: string, correct = 'true') => ({
      key,
      kind: 'true_false' as const,
      prompt: `Is ${key} right?`,
      options: [
        { key: 'true', text: 'True' },
        { key: 'false', text: 'False' },
      ],
      correct,
      explanation: 'It is stored by the cart.',
      evidence: [{ path, symbol: 'addToCart' }],
    })
    const result = await ground(
      draft({
        quiz: [
          question('kept', 'src/cart.ts'),
          question('unsupported', 'src/missing.ts'),
          question('broken', 'src/cart.ts', 'maybe'),
        ],
      }),
    )
    expect(result.lesson.quiz?.map((item) => item.key)).toEqual(['kept'])
    expect(result.failures.map((failure) => failure.code)).toEqual([
      'UNRESOLVED_EVIDENCE',
      'UNSUPPORTED_QUESTION',
      'INVALID_QUESTION',
    ])
    expect(result.claims).toEqual({ total: 3, supported: 1 })
  })

  it('only keeps references that a surviving block or question uses', async () => {
    const result = await ground(
      draft({
        blocks: [
          {
            type: 'prose',
            kind: 'observed',
            md: 'Calls `invented.thing()`.',
            evidence: [{ path: 'src/cart.ts', symbol: 'addToCart' }],
          },
        ],
      }),
    )
    expect(result.refs).toEqual({})
  })
})
