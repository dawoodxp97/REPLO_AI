import type { Block, CourseContent, Lesson, Question } from '@replo/contracts'

export function allLessons(content: CourseContent): Lesson[] {
  return content.chapters.flatMap((chapter) => chapter.lessons)
}

export function allBlocks(content: CourseContent): Block[] {
  return [
    ...(content.architecture?.blocks ?? []),
    ...allLessons(content).flatMap((lesson) => lesson.blocks),
  ]
}

export function allQuestions(content: CourseContent): Question[] {
  return allLessons(content).flatMap((lesson) => lesson.quiz ?? [])
}

export function usedRefIds(content: CourseContent): Set<string> {
  const ids = new Set<string>()
  for (const block of allBlocks(content)) for (const id of refIdsOfBlock(block)) ids.add(id)
  for (const question of allQuestions(content))
    for (const id of refIdsOfQuestion(question)) ids.add(id)
  for (const diagram of content.diagrams) {
    for (const node of diagram.nodes) for (const id of node.refIds) ids.add(id)
    for (const edge of diagram.edges) for (const id of edge.refIds) ids.add(id)
  }
  for (const item of content.furtherReading) ids.add(item.refId)
  return ids
}

export function lessonRefIds(content: CourseContent): Set<string> {
  const ids = new Set<string>()
  for (const lesson of allLessons(content)) {
    for (const block of lesson.blocks) for (const id of refIdsOfBlock(block)) ids.add(id)
    for (const question of lesson.quiz ?? [])
      for (const id of refIdsOfQuestion(question)) ids.add(id)
  }
  return ids
}

export function refIdsOfBlock(block: Block): string[] {
  switch (block.type) {
    case 'prose':
      return block.evidence.map((item) => item.refId)
    case 'code':
      return [block.refId]
    case 'diagram':
      return []
    case 'exercise':
      return block.solutionRefs
    case 'callout':
      return []
  }
}

export function refIdsOfQuestion(question: Question): string[] {
  return question.evidence.map((item) => item.refId)
}

export function pathsOfRefs(content: CourseContent, refIds: Iterable<string>): Set<string> {
  const paths = new Set<string>()
  for (const refId of refIds) {
    const ref = content.sourceRefs[refId]
    if (ref) paths.add(ref.path)
  }
  return paths
}

export function contentStrings(content: CourseContent): string[] {
  return [
    content.meta.title,
    ...content.meta.objectives,
    ...content.meta.prerequisites,
    ...content.tours.flatMap((tour) => [
      tour.key,
      tour.title,
      tour.objective,
      ...tour.steps.flatMap((step) => [step.title, step.summary]),
    ]),
    ...content.diagrams.flatMap((diagram) => [
      diagram.id,
      diagram.title,
      diagram.caption,
      ...diagram.nodes.flatMap((node) => [node.label, node.kind]),
      ...diagram.edges.flatMap((edge) => [edge.id, edge.label ?? '']),
    ]),
    ...(content.architecture === undefined
      ? []
      : [content.architecture.diagram.caption, content.architecture.diagram.mermaid]),
    ...content.chapters.flatMap((chapter) => [
      chapter.key,
      chapter.title,
      chapter.summary,
      ...chapter.objectives,
      ...chapter.prerequisites,
      ...chapter.lessons.flatMap((lesson) => [
        lesson.key,
        lesson.title,
        ...lesson.blocks.flatMap(blockStrings),
        ...(lesson.quiz ?? []).flatMap(questionStrings),
      ]),
    ]),
    ...content.openQuestions,
    ...content.furtherReading.map((item) => item.why),
  ]
}

function blockStrings(block: Block): string[] {
  switch (block.type) {
    case 'prose':
      return [block.md]
    case 'code':
      return [block.caption]
    case 'diagram':
      return [block.caption, block.mermaid]
    case 'callout':
      return [block.md]
    case 'exercise':
      return [block.prompt, ...block.hints]
  }
}

function questionStrings(question: Question): string[] {
  return [question.prompt, question.explanation, ...question.options.map((option) => option.text)]
}
