import { describe, expect, it } from 'vitest'
import { scoreRubric } from './course-rubric'
import { testContent, testTruth } from './test-course'

describe('scoreRubric', () => {
  it('scores a coherent, fully quizzed course at one', () => {
    expect(scoreRubric(testTruth, testContent())).toEqual({
      courseCoherence: 1,
      quizQuality: 1,
    })
  })

  it('lowers quiz quality when a chapter has no questions', () => {
    const content = testContent()
    content.chapters[1]!.lessons[0]!.quiz = []
    expect(scoreRubric(testTruth, content).quizQuality).toBeLessThan(1)
  })

  it('lowers quiz quality when an explanation is too short', () => {
    const content = testContent()
    content.chapters[0]!.lessons[0]!.quiz![0]!.explanation = 'Short.'
    expect(scoreRubric(testTruth, content).quizQuality).toBeLessThan(1)
  })

  it('lowers coherence for a prerequisite that points forward', () => {
    const content = testContent()
    content.chapters[2]!.prerequisites = ['chapter-3']
    expect(scoreRubric(testTruth, content).courseCoherence).toBeLessThan(1)
  })

  it('lowers coherence when the lessons omit a fact path', () => {
    const content = testContent()
    for (const chapter of content.chapters) {
      for (const lesson of chapter.lessons) {
        for (const block of lesson.blocks) {
          if (block.type === 'prose') block.evidence = [{ refId: 'r_a' }]
          if (block.type === 'code') block.refId = 'r_a'
        }
        for (const question of lesson.quiz ?? []) question.evidence = [{ refId: 'r_a' }]
      }
    }
    expect(scoreRubric(testTruth, content).courseCoherence).toBeLessThan(1)
  })
})
