'use client'

import type { LearnerQuestion, SourceRef } from '@replo/contracts'
import { Alert, Button } from '@replo/ui'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { EvidenceChips } from '@/features/player/claim-preview'
import { orpc } from '@/lib/orpc'

export interface QuestionCardProps {
  versionId: string
  lessonKey: string
  question: LearnerQuestion
  references: Readonly<Record<string, SourceRef | undefined>>
  onOpenReference: (refId: string) => void
}

export function QuestionCard({
  versionId,
  lessonKey,
  question,
  references,
  onOpenReference,
}: QuestionCardProps) {
  const [choice, setChoice] = useState('')
  const submit = useMutation(orpc.learning.submitQuiz.mutationOptions())
  const result = submit.data
  const locked = result !== undefined || submit.isPending
  const correctText = question.options.find((option) => option.key === result?.correctKey)?.text

  return (
    <fieldset disabled={locked} className="space-y-4 rounded-lg border border-border bg-card p-4">
      <legend className="px-1 text-sm font-medium">{question.prompt}</legend>
      <div className="space-y-2">
        {question.options.map((option) => (
          <label
            key={option.key}
            className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-border px-3 py-2 text-sm has-[:checked]:border-primary has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring"
          >
            <input
              type="radio"
              name={`quiz-${question.key}`}
              value={option.key}
              checked={choice === option.key}
              onChange={() => setChoice(option.key)}
              className="size-4 accent-primary"
            />
            {option.text}
          </label>
        ))}
      </div>
      <Button
        type="button"
        size="sm"
        disabled={choice === '' || locked}
        onClick={() =>
          submit.mutate({ versionId, lessonKey, questionKey: question.key, choiceKey: choice })
        }
      >
        {submit.isPending ? 'Checking…' : 'Check answer'}
      </Button>

      <div aria-live="polite" className="space-y-2 text-sm">
        {result ? (
          <>
            <p className="font-medium">{result.correct ? 'Correct.' : 'Not quite.'}</p>
            {result.correct ? null : correctText ? <p>The answer is “{correctText}”.</p> : null}
            <p className="text-muted-foreground">{result.explanation}</p>
            <EvidenceChips
              refIds={question.evidence.map((item) => item.refId)}
              references={references}
              onOpenReference={onOpenReference}
            />
          </>
        ) : null}
      </div>

      {submit.isError ? (
        <Alert tone="destructive" role="alert">
          The answer could not be checked. Try again.
        </Alert>
      ) : null}
    </fieldset>
  )
}
