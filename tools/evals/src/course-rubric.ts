import type { Chapter, CourseContent, Lesson, Question } from '@replo/contracts'
import { allQuestions, lessonRefIds, pathsOfRefs } from './course-content'
import { mean, ratio } from './statistics'
import type { TruthSheet } from './truth-sheet'

export interface RubricScore {
  courseCoherence: number
  quizQuality: number
}

export function scoreRubric(sheet: TruthSheet, content: CourseContent): RubricScore {
  const lessonPaths = pathsOfRefs(content, lessonRefIds(content))
  return {
    courseCoherence: mean([
      structureScore(content),
      sequencingScore(content.chapters),
      groundingScore(content),
      flowTeachingScore(sheet, lessonPaths),
      factCoverageScore(sheet, lessonPaths),
    ]),
    quizQuality: quizQuality(content),
  }
}

function structureScore(content: CourseContent): number {
  const lessons = content.chapters.flatMap((chapter) => chapter.lessons)
  const checks = [
    content.chapters.length >= 3,
    content.meta.objectives.length > 0,
    content.graph.nodes.length > 0,
    content.tours.length > 0,
    content.diagrams.length > 0,
    ...content.chapters.map(chapterFieldsPresent),
    ...content.chapters.map((chapter) => chapter.objectives.length > 0),
    ...content.chapters.map((chapter) => chapter.lessons.length > 0),
    ...lessons.map(lessonFieldsPresent),
    ...lessons.map((lesson) => lesson.blocks.length > 0),
  ]
  return ratio(checks.filter(Boolean).length, checks.length)
}

function chapterFieldsPresent(chapter: Chapter): boolean {
  return chapter.key.length > 0 && chapter.title.length > 0 && chapter.summary.length > 0
}

function lessonFieldsPresent(lesson: Lesson): boolean {
  return lesson.key.length > 0 && lesson.title.length > 0 && lesson.minutes > 0
}

function sequencingScore(chapters: readonly Chapter[]): number {
  const position = new Map<string, number>()
  for (const [index, chapter] of chapters.entries()) {
    position.set(chapter.key, index)
    position.set(chapter.title, index)
  }
  const ordered = chapters.flatMap((chapter, index) =>
    chapter.prerequisites.flatMap((prerequisite) => {
      const target = position.get(prerequisite)
      return target === undefined ? [] : [target < index]
    }),
  )
  return ratio(ordered.filter(Boolean).length, ordered.length)
}

function groundingScore(content: CourseContent): number {
  const lessons = content.chapters.flatMap((chapter) => chapter.lessons)
  return ratio(lessons.filter(hasEvidence).length, lessons.length)
}

function hasEvidence(lesson: Lesson): boolean {
  const blocks = lesson.blocks.some((block) => {
    if (block.type === 'prose') return block.evidence.length > 0
    if (block.type === 'code') return block.refId.length > 0
    if (block.type === 'exercise') return block.solutionRefs.length > 0
    return false
  })
  return blocks || (lesson.quiz ?? []).some((question) => question.evidence.length > 0)
}

function flowTeachingScore(sheet: TruthSheet, lessonPaths: ReadonlySet<string>): number {
  return ratio(
    sheet.keyFlows.filter((flow) => flow.hops.every((hop) => lessonPaths.has(hop))).length,
    sheet.keyFlows.length,
  )
}

function factCoverageScore(sheet: TruthSheet, lessonPaths: ReadonlySet<string>): number {
  const paths = new Set(sheet.facts.map((fact) => fact.evidencePath))
  return ratio([...paths].filter((path) => lessonPaths.has(path)).length, paths.size)
}

function quizQuality(content: CourseContent): number {
  const chaptersWithQuiz = content.chapters.filter((chapter) =>
    chapter.lessons.some((lesson) => (lesson.quiz ?? []).length > 0),
  )
  const coverage = ratio(chaptersWithQuiz.length, content.chapters.length)
  const questions = allQuestions(content)
  return coverage * validQuestionRate(questions)
}

function validQuestionRate(questions: readonly Question[]): number {
  const keys = new Set<string>()
  const valid = questions.filter((question) => {
    const firstUse = !keys.has(question.key)
    keys.add(question.key)
    return firstUse && questionPasses(question)
  })
  return ratio(valid.length, questions.length)
}

function questionPasses(question: Question): boolean {
  const optionKeys = question.options.map((option) => option.key)
  const optionTexts = question.options.map((option) => option.text.toLowerCase().trim())
  const forbidden = /^(all|none) of the above$/
  return (
    question.evidence.length > 0 &&
    question.prompt.trim().length >= 10 &&
    question.explanation.trim().length >= 20 &&
    new Set(optionKeys).size === optionKeys.length &&
    new Set(optionTexts).size === optionTexts.length &&
    optionKeys.includes(question.correct) &&
    !optionTexts.some((text) => forbidden.test(text))
  )
}
