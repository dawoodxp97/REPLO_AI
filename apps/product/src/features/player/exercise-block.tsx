import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@replo/ui'
import { ChevronRight } from 'lucide-react'
import { EvidenceChips } from './evidence-chips'
import type { SourceRefMap } from './source-ref-map'

export interface ExerciseBlockProps {
  prompt: string
  hints: readonly string[]
  solutionRefs: readonly string[]
  references: SourceRefMap
  onOpenReference: (refId: string) => void
}

export function ExerciseBlock({
  prompt,
  hints,
  solutionRefs,
  references,
  onOpenReference,
}: ExerciseBlockProps) {
  return (
    <Card aria-label="Exercise" role="region" className="gap-4">
      <CardHeader>
        <CardTitle>Exercise</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p>{prompt}</p>
        {hints.length > 0 ? (
          <Collapsible className="group/hints">
            <CollapsibleTrigger className="inline-flex cursor-pointer items-center gap-1 rounded-sm pointer-coarse:min-h-10 text-sm text-link underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/40">
              <ChevronRight className="size-4 transition-transform group-data-[open]/hints:rotate-90" />
              Show a hint
            </CollapsibleTrigger>
            <CollapsibleContent>
              <ul className="mt-2 list-disc space-y-1 pl-9 text-muted-foreground">
                {hints.map((hint) => (
                  <li key={hint}>{hint}</li>
                ))}
              </ul>
            </CollapsibleContent>
          </Collapsible>
        ) : null}
        <EvidenceChips
          refIds={solutionRefs}
          references={references}
          onOpenReference={onOpenReference}
        />
      </CardContent>
    </Card>
  )
}
