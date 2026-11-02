import { describe, expect, it } from 'vitest'
import { JobError } from '../../jobs/errors'
import { fixtureIndex } from '../../test/grounding'
import { normaliseOutline } from './context'
import type { OutlineDraft } from './drafts'

type Lesson = OutlineDraft['chapters'][number]['lessons'][number]

const lesson = (key: string, focusPaths: string[]): Lesson => ({
  key,
  title: key,
  minutes: 5,
  focusPaths,
})

const chapter = (key: string, lessons: Lesson[]): OutlineDraft['chapters'][number] => ({
  key,
  title: key,
  summary: key,
  objectives: ['learn'],
  prerequisites: [],
  lessons,
})

const outlineOf = (chapters: OutlineDraft['chapters']): OutlineDraft => ({
  title: 'Outline',
  objectives: ['learn'],
  prerequisites: [],
  chapters,
})

const focusOf = (outline: OutlineDraft) =>
  outline.chapters.map((entry) => entry.lessons.map((item) => item.focusPaths))

describe('normaliseOutline', () => {
  const ranked = ['src/cart.ts', 'src/api/routes.ts']

  it('stores the normalised path and drops duplicates', () => {
    const outline = outlineOf([
      chapter('a', [lesson('one', ['./src/cart.ts', 'src/cart.ts', '/src/api/routes.ts'])]),
    ])
    expect(focusOf(normaliseOutline(outline, fixtureIndex(), 5, ranked))).toEqual([
      [['src/cart.ts', 'src/api/routes.ts']],
    ])
  })

  it('backfills a lesson with no valid path from its chapter siblings', () => {
    const outline = outlineOf([
      chapter('a', [lesson('one', ['src/api/routes.ts']), lesson('two', ['src/ghost.ts'])]),
    ])
    expect(focusOf(normaliseOutline(outline, fixtureIndex(), 5, ranked))).toEqual([
      [['src/api/routes.ts'], ['src/api/routes.ts']],
    ])
  })

  it('backfills a chapter whose paths are all invalid from the ranked files', () => {
    const outline = outlineOf([chapter('a', [lesson('one', ['nope/a.ts', '../escape.ts'])])])
    expect(focusOf(normaliseOutline(outline, fixtureIndex(), 5, ranked))).toEqual([
      [['src/cart.ts', 'src/api/routes.ts']],
    ])
  })

  it('fails with a non-retryable error when no file can be found at all', () => {
    const outline = outlineOf([chapter('a', [lesson('one', ['nope/a.ts'])])])
    expect.assertions(3)
    try {
      normaliseOutline(outline, fixtureIndex(), 5, ['also/missing.ts'])
    } catch (err) {
      expect(err).toBeInstanceOf(JobError)
      expect(err).toMatchObject({ code: 'OUTLINE_INVALID' })
      expect(err).toMatchObject({ retryable: false })
    }
  })

  it('keeps keys unique and respects the chapter cap', () => {
    const outline = outlineOf([
      chapter('a', [lesson('one', ['src/cart.ts'])]),
      chapter('a', [lesson('one', ['src/cart.ts'])]),
      chapter('b', [lesson('three', ['src/cart.ts'])]),
    ])
    const result = normaliseOutline(outline, fixtureIndex(), 2, ranked)
    expect(result.chapters.map((entry) => entry.key)).toEqual(['a', 'a-2'])
    expect(result.chapters.flatMap((entry) => entry.lessons.map((item) => item.key))).toEqual([
      'one',
      'one-2',
    ])
  })
})
