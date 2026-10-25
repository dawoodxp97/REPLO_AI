import type { LearnerLesson, TutorialOverviewDto } from '@replo/contracts'
import { describe, expect, it } from 'vitest'
import { collectReferenceIds, flattenLessons, neighbours, nextReference } from './lesson-navigation'

const outline: TutorialOverviewDto['outline'] = [
  {
    key: 'ch1',
    title: 'Cart',
    summary: '',
    lessons: [
      { key: 'l1', title: 'Button', minutes: 5 },
      { key: 'l2', title: 'Thunk', minutes: 7 },
    ],
  },
  {
    key: 'ch2',
    title: 'Store',
    summary: '',
    lessons: [{ key: 'l3', title: 'Reducer', minutes: 6 }],
  },
]

describe('flattenLessons', () => {
  it('lists every lesson in reading order across chapters', () => {
    expect(flattenLessons(outline).map((position) => position.lessonKey)).toEqual([
      'l1',
      'l2',
      'l3',
    ])
  })
})

describe('neighbours', () => {
  const sequence = flattenLessons(outline)

  it('finds the lessons on either side, crossing chapters', () => {
    const around = neighbours(sequence, 'l2')
    expect(around.previous?.lessonKey).toBe('l1')
    expect(around.next?.lessonKey).toBe('l3')
  })

  it('has no previous lesson at the start and no next at the end', () => {
    expect(neighbours(sequence, 'l1').previous).toBeNull()
    expect(neighbours(sequence, 'l3').next).toBeNull()
  })

  it('has no neighbours for an unknown lesson', () => {
    expect(neighbours(sequence, 'missing')).toEqual({ previous: null, next: null })
  })
})

describe('collectReferenceIds', () => {
  it('gathers evidence, code, exercise and quiz references once each, in order', () => {
    const lesson: LearnerLesson = {
      key: 'l1',
      title: 'Button',
      minutes: 5,
      blocks: [
        {
          type: 'prose',
          md: 'The button dispatches a thunk.',
          kind: 'observed',
          evidence: [{ refId: 'r1' }, { refId: 'r2' }],
        },
        { type: 'code', refId: 'r2', caption: 'Thunk' },
        { type: 'exercise', prompt: 'Trace it', hints: [], solutionRefs: ['r3'] },
      ],
      quiz: [
        {
          key: 'q1',
          kind: 'true_false',
          prompt: 'The button dispatches a thunk.',
          options: [
            { key: 'true', text: 'True' },
            { key: 'false', text: 'False' },
          ],
          evidence: [{ refId: 'r4' }],
        },
      ],
    }

    expect(collectReferenceIds(lesson)).toEqual(['r1', 'r2', 'r3', 'r4'])
  })
})

describe('nextReference', () => {
  it('starts at the first reference and cycles through them', () => {
    const references = ['r1', 'r2']
    expect(nextReference(references, null)).toBe('r1')
    expect(nextReference(references, 'r1')).toBe('r2')
    expect(nextReference(references, 'r2')).toBe('r1')
  })

  it('returns null when the lesson cites nothing', () => {
    expect(nextReference([], null)).toBeNull()
  })
})
