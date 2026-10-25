import type { ImportRepositoryInput, RunEstimate } from '@replo/contracts'
import {
  Alert,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
} from '@replo/ui'
import { skipToken, useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { formatCount, formatUsd } from '@/lib/format'
import { orpc } from '@/lib/orpc'
import { describeImportError } from './import-errors'

export function EstimateCard({ input }: { input: ImportRepositoryInput | undefined }) {
  const estimate = useQuery(orpc.repositories.estimate.queryOptions({ input: input ?? skipToken }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Estimate</CardTitle>
        <CardDescription>What this run is expected to cost, before it starts.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <EstimateBody
          hasInput={input !== undefined}
          isPending={estimate.isPending && input !== undefined}
          error={estimate.isError ? estimate.error : undefined}
          estimate={estimate.data}
        />
      </CardContent>
    </Card>
  )
}

interface EstimateBodyProps {
  hasInput: boolean
  isPending: boolean
  error: unknown
  estimate: RunEstimate | undefined
}

function EstimateBody({ hasInput, isPending, error, estimate }: EstimateBodyProps) {
  if (!hasInput) {
    return (
      <p className="text-sm text-muted-foreground">
        Choose a repository, a key and a preset to see the estimate.
      </p>
    )
  }

  if (isPending) return <Skeleton aria-busy="true" className="h-24 w-full" />

  if (error !== undefined) {
    return (
      <Alert tone="destructive" role="alert">
        {describeImportError(error)}
      </Alert>
    )
  }

  if (!estimate) return null

  const overCeiling = estimate.estimateUsd > estimate.budgetUsd

  return (
    <div className="space-y-4">
      <dl aria-live="polite" className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-3">
        <Figure label="Estimated cost" value={formatUsd(estimate.estimateUsd)} />
        <Figure label="Budget ceiling" value={formatUsd(estimate.budgetUsd)} />
        <Figure label="Requests" value={formatCount(estimate.requests)} />
        <Figure
          label="Tokens in / out"
          value={`${formatCount(estimate.inputTokens)} / ${formatCount(estimate.outputTokens)}`}
        />
        <Figure
          label="Pipeline"
          value={estimate.pipeline === 'full' ? 'Full' : 'Lite (fewer requests)'}
        />
        <Figure label="Models" value={modelList(estimate)} />
      </dl>
      {overCeiling ? (
        <Alert tone="interpretation" role="status">
          The estimate is above your ceiling. Raise the ceiling or choose a cheaper preset.
        </Alert>
      ) : null}
      <p className="text-xs text-muted-foreground">
        Based on the repository index and catalogue prices. Your provider’s bill can differ.
      </p>
    </div>
  )
}

function Figure({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium break-words">{value}</dd>
    </div>
  )
}

function modelList(estimate: RunEstimate): string {
  return [estimate.models.planner, estimate.models.author, estimate.models.summarizer]
    .filter((model): model is string => model !== null)
    .join(' · ')
}
