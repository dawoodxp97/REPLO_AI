import { describe, expect, it } from 'vitest'
import { ImportRepositoryInput, TutorialContent } from './index'

const KEY_ID = '0190f6a2-7c1e-7d4a-8f3b-2a9c4e5d6f70'

describe('ImportRepositoryInput', () => {
  it('accepts a public GitHub URL and applies defaults', () => {
    const parsed = ImportRepositoryInput.parse({
      source: { kind: 'public_url', url: 'https://github.com/vercel/next.js' },
      keyId: KEY_ID,
    })
    expect(parsed.audience).toBe('intermediate')
    expect(parsed.preset).toBe('balanced')
  })

  it('rejects non-GitHub hosts (SSRF guard)', () => {
    const result = ImportRepositoryInput.safeParse({
      source: { kind: 'public_url', url: 'https://evil.example.com/a/b' },
      keyId: KEY_ID,
    })
    expect(result.success).toBe(false)
  })

  it('requires a BYOK key id: every job runs on the user’s own key', () => {
    const result = ImportRepositoryInput.safeParse({
      source: { kind: 'public_url', url: 'https://github.com/a/b' },
    })
    expect(result.success).toBe(false)
  })
})

describe('TutorialContent', () => {
  it('parses a minimal grounded lesson', () => {
    const content = TutorialContent.parse({
      schemaVersion: 1,
      meta: {
        title: 'Shopfront',
        repo: { owner: 'acme', name: 'shopfront', commitSha: 'a'.repeat(40) },
        audience: 'intermediate',
        objectives: ['Understand add-to-cart'],
        prerequisites: [],
      },
      chapters: [
        {
          key: 'ch3',
          title: 'Cart',
          summary: 'How the cart works',
          objectives: ['Trace a click'],
          prerequisites: [],
          lessons: [
            {
              key: 'ch3-l2',
              title: 'Add to cart',
              minutes: 12,
              blocks: [
                {
                  type: 'prose',
                  kind: 'observed',
                  md: 'The button dispatches `addItem`.',
                  evidence: [{ refId: 'r1' }],
                },
                { type: 'code', refId: 'r1', caption: 'Click handler' },
              ],
              quiz: [
                {
                  key: 'q1',
                  kind: 'multiple_choice',
                  prompt: 'Who sends the request?',
                  options: [
                    { key: 'a', text: 'ProductCard' },
                    { key: 'b', text: 'the thunk' },
                    { key: 'c', text: 'the route' },
                  ],
                  correct: 'b',
                  explanation: 'The component only dispatches.',
                  evidence: [{ refId: 'r1' }],
                },
              ],
            },
          ],
        },
      ],
      sourceRefs: {
        r1: { path: 'src/cart.ts', startLine: 9, endLine: 27, blobSha: 'b'.repeat(40) },
      },
      furtherReading: [],
      openQuestions: [],
    })
    expect(content.chapters[0]?.lessons[0]?.quiz?.[0]?.correct).toBe('b')
  })

  const questionSchema =
    TutorialContent.shape.chapters.element.shape.lessons.element.shape.quiz.unwrap().element

  it('rejects a multiple choice question with fewer than 3 options', () => {
    const result = questionSchema.safeParse({
      key: 'q',
      kind: 'multiple_choice',
      prompt: 'p',
      options: [
        { key: 'a', text: 'x' },
        { key: 'b', text: 'y' },
      ],
      correct: 'a',
      explanation: 'e',
      evidence: [{ refId: 'r' }],
    })
    expect(result.success).toBe(false)
  })

  it('accepts a true/false question with exactly two options', () => {
    const result = questionSchema.safeParse({
      key: 'q',
      kind: 'true_false',
      prompt: 'The cart is stored in memory.',
      options: [
        { key: 'true', text: 'True' },
        { key: 'false', text: 'False' },
      ],
      correct: 'false',
      explanation: 'It is stored in the session.',
      evidence: [{ refId: 'r' }],
    })
    expect(result.success).toBe(true)
  })

  it('rejects a true/false question with three options', () => {
    const result = questionSchema.safeParse({
      key: 'q',
      kind: 'true_false',
      prompt: 'p',
      options: [
        { key: 'true', text: 'True' },
        { key: 'false', text: 'False' },
        { key: 'maybe', text: 'Maybe' },
      ],
      correct: 'true',
      explanation: 'e',
      evidence: [{ refId: 'r' }],
    })
    expect(result.success).toBe(false)
  })

  it('rejects a question whose correct key names no option', () => {
    const result = questionSchema.safeParse({
      key: 'q',
      kind: 'true_false',
      prompt: 'p',
      options: [
        { key: 'true', text: 'True' },
        { key: 'false', text: 'False' },
      ],
      correct: 'maybe',
      explanation: 'e',
      evidence: [{ refId: 'r' }],
    })
    expect(result.success).toBe(false)
  })
})
