import type { Chapter, LearnerChapter, LearnerQuestion, Question } from '@replo/contracts'

export function learnerChapter(chapter: Chapter): LearnerChapter {
  return {
    key: chapter.key,
    title: chapter.title,
    summary: chapter.summary,
    objectives: chapter.objectives,
    prerequisites: chapter.prerequisites,
    lessons: chapter.lessons.map((lesson) => ({
      key: lesson.key,
      title: lesson.title,
      minutes: lesson.minutes,
      blocks: lesson.blocks,
      quiz: lesson.quiz?.map(learnerQuestion),
    })),
  }
}

function learnerQuestion(question: Question): LearnerQuestion {
  return {
    key: question.key,
    kind: question.kind,
    prompt: question.prompt,
    options: question.options,
    evidence: question.evidence,
  }
}

export function permalinkOf(owner: string, repo: string, commitSha: string, path: string): string {
  const encoded = path.split('/').map(encodeURIComponent).join('/')
  return `https://github.com/${owner}/${repo}/blob/${commitSha}/${encoded}`
}
