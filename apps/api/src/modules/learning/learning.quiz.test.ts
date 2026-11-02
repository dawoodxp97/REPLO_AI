import { describe, expect, it } from 'vitest'
import type { TutorialContent } from '@replo/contracts'
import { gradeAnswer } from './learning.quiz'

const content = {
  chapters: [
    {
      lessons: [
        {
          key: 'cart',
          quiz: [
            {
              key: 'total',
              options: [{ key: 'sum' }, { key: 'last' }],
              correct: 'sum',
              explanation: 'Totals add up every line item.',
            },
          ],
        },
        { key: 'plain' },
      ],
    },
  ],
} as unknown as TutorialContent

describe('gradeAnswer', () => {
  it('marks the correct choice and returns the explanation', () => {
    expect(
      gradeAnswer(content, { lessonKey: 'cart', questionKey: 'total', choiceKey: 'sum' }),
    ).toEqual({
      questionKey: 'total',
      choiceKey: 'sum',
      result: { correct: true, correctKey: 'sum', explanation: 'Totals add up every line item.' },
    })
  })

  it('marks a wrong option as incorrect while revealing the right one', () => {
    expect(
      gradeAnswer(content, { lessonKey: 'cart', questionKey: 'total', choiceKey: 'last' }).result,
    ).toMatchObject({ correct: false, correctKey: 'sum' })
  })

  it('reports a missing lesson, a lesson without a quiz and a missing question as not found', () => {
    for (const answer of [
      { lessonKey: 'gone', questionKey: 'total', choiceKey: 'sum' },
      { lessonKey: 'plain', questionKey: 'total', choiceKey: 'sum' },
      { lessonKey: 'cart', questionKey: 'gone', choiceKey: 'sum' },
    ]) {
      expect(() => gradeAnswer(content, answer)).toThrowError(/not found/)
    }
  })

  it('refuses a choice that is not an option', () => {
    expect(() =>
      gradeAnswer(content, { lessonKey: 'cart', questionKey: 'total', choiceKey: 'zzz' }),
    ).toThrowError(/not an option/)
  })
})
