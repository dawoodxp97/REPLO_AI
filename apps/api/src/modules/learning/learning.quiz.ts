import type { QuizResultDto, TutorialContent } from '@replo/contracts'
import { badRequest, notFound } from '../../platform/errors'

interface Answer {
  lessonKey: string
  questionKey: string
  choiceKey: string
}

export interface GradedAnswer {
  questionKey: string
  choiceKey: string
  result: QuizResultDto
}

export function gradeAnswer(content: TutorialContent, answer: Answer): GradedAnswer {
  const lesson = content.chapters
    .flatMap((chapter) => chapter.lessons)
    .find((entry) => entry.key === answer.lessonKey)
  if (!lesson) notFound('Lesson')
  const question = lesson.quiz?.find((entry) => entry.key === answer.questionKey)
  if (!question) notFound('Question')
  if (!question.options.some((option) => option.key === answer.choiceKey))
    badRequest('choice is not an option of this question')
  return {
    questionKey: question.key,
    choiceKey: answer.choiceKey,
    result: {
      correct: answer.choiceKey === question.correct,
      correctKey: question.correct,
      explanation: question.explanation,
    },
  }
}
