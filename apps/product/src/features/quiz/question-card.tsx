'use client'

import type { LearnerQuestion } from '@replo/contracts'
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  RadioGroup,
  Spinner,
} from '@replo/ui'
import { CircleCheck, CircleX } from 'lucide-react'
import { useId, useState } from 'react'
import { InlineError } from '@/components/inline-error'
import { EvidenceChips } from '@/features/player/evidence-chips'
import type { SourceRefMap } from '@/features/player/source-ref-map'
import { QuizOption, type OptionOutcome } from './quiz-option'
import { useSubmitQuiz } from './use-submit-quiz'

export interface QuestionCardProps {
  versionId: string
  lessonKey: string
  question: LearnerQuestion
  references: SourceRefMap
  onOpenReference: (refId: string) => void
}

export function QuestionCard({
  versionId,
  lessonKey,
  question,
  references,
  onOpenReference,
}: QuestionCardProps) {
  const promptId = useId()
  const [choice, setChoice] = useState('')
  const submit = useSubmitQuiz()
  const result = submit.data
  const locked = result !== undefined || submit.isPending
  const correctText = question.options.find((option) => option.key === result?.correctKey)?.text

  function outcomeOf(optionKey: string): OptionOutcome | null {
    if (!result) return null
    if (optionKey === result.correctKey) return 'correct'
    return optionKey === choice ? 'incorrect' : null
  }

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle as="h3" id={promptId} className="text-base">
          {question.prompt}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <RadioGroup aria-labelledby={promptId} className="gap-2">
          {question.options.map((option) => (
            <QuizOption
              key={option.key}
              name={`quiz-${lessonKey}-${question.key}`}
              value={option.key}
              text={option.text}
              checked={choice === option.key}
              disabled={locked}
              outcome={outcomeOf(option.key)}
              onSelect={() => setChoice(option.key)}
            />
          ))}
        </RadioGroup>
      </CardContent>
      <CardFooter className="flex-col items-stretch gap-4 border-t-0 pt-0">
        <div>
          <Button
            type="button"
            size="sm"
            disabled={choice === '' || locked}
            onClick={() =>
              submit.mutate({ versionId, lessonKey, questionKey: question.key, choiceKey: choice })
            }
          >
            {submit.isPending ? <Spinner /> : null}
            {submit.isPending ? 'Checking…' : 'Check answer'}
          </Button>
        </div>

        <div aria-live="polite" className="space-y-3">
          {result ? (
            <>
              <Alert variant={result.correct ? 'observed' : 'destructive'}>
                {result.correct ? <CircleCheck /> : <CircleX />}
                <AlertTitle>{result.correct ? 'Correct.' : 'Not quite.'}</AlertTitle>
                <AlertDescription>
                  {result.correct ? null : correctText ? (
                    <p className="text-foreground">The answer is “{correctText}”.</p>
                  ) : null}
                  <p>{result.explanation}</p>
                </AlertDescription>
              </Alert>
              <EvidenceChips
                refIds={question.evidence.map((item) => item.refId)}
                references={references}
                onOpenReference={onOpenReference}
              />
            </>
          ) : null}
        </div>

        {submit.isError ? (
          <InlineError>The answer could not be checked. Try again.</InlineError>
        ) : null}
      </CardFooter>
    </Card>
  )
}
