import type { LearnerQuestion } from '@replo/contracts'
import { SectionHeader } from '@/components/page-header'
import type { SourceRefMap } from '@/features/player/source/source-refs'
import { QuestionCard } from './question-card'

export interface QuizSectionProps {
  versionId: string
  lessonKey: string
  questions: readonly LearnerQuestion[]
  references: SourceRefMap
  onOpenReference: (refId: string) => void
}

export function QuizSection({
  versionId,
  lessonKey,
  questions,
  references,
  onOpenReference,
}: QuizSectionProps) {
  return (
    <section aria-labelledby="quiz-heading" className="space-y-4">
      <SectionHeader id="quiz-heading" title="Check your understanding" />
      {questions.map((question) => (
        <QuestionCard
          key={`${lessonKey}:${question.key}`}
          versionId={versionId}
          lessonKey={lessonKey}
          question={question}
          references={references}
          onOpenReference={onOpenReference}
        />
      ))}
    </section>
  )
}
