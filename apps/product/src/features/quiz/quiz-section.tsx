import type { LearnerQuestion, SourceRef } from '@replo/contracts'
import { QuestionCard } from './question-card'

export interface QuizSectionProps {
  versionId: string
  lessonKey: string
  questions: readonly LearnerQuestion[]
  references: Readonly<Record<string, SourceRef | undefined>>
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
      <h2 id="quiz-heading" className="font-serif text-2xl font-medium">
        Check your understanding
      </h2>
      {questions.map((question) => (
        <QuestionCard
          key={question.key}
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
