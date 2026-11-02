'use client'

import type { ImportRepositoryInput, RunEstimate } from '@replo/contracts'
import {
  Alert,
  AlertDescription,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
} from '@replo/ui'
import { skipToken, useQuery } from '@tanstack/react-query'
import { TriangleAlert } from 'lucide-react'
import { DescriptionItem } from '@/components/description-item'
import { QueryBoundary } from '@/components/query-boundary'
import { formatCount, formatUsd } from '@/lib/format'
import { orpc } from '@/lib/orpc'
import { describeImportError } from './import-errors'

export interface EstimateCardProps {
  input: ImportRepositoryInput | undefined
  settling: boolean
}

export function EstimateCard({ input, settling }: EstimateCardProps) {
  const estimate = useQuery(orpc.repositories.estimate.queryOptions({ input: input ?? skipToken }))
  const loading = <Skeleton aria-busy="true" className="h-24 w-full" />

  return (
    <Card>
      <CardHeader>
        <CardTitle>Estimate</CardTitle>
        <CardDescription>What this run is expected to cost, before it starts.</CardDescription>
      </CardHeader>
      <CardContent>
        {settling ? (
          loading
        ) : input === undefined ? (
          <p className="text-sm text-muted-foreground">
            Choose a repository, a key and a preset to see the estimate.
          </p>
        ) : (
          <QueryBoundary
            query={estimate}
            errorTitle="We could not estimate this run"
            errorDescription={describeImportError(estimate.error)}
            loading={loading}
          >
            {(data) => <EstimateSummary estimate={data} />}
          </QueryBoundary>
        )}
      </CardContent>
    </Card>
  )
}

function EstimateSummary({ estimate }: { estimate: RunEstimate }) {
  const overCeiling = estimate.estimateUsd > estimate.budgetUsd

  return (
    <div className="space-y-4">
      <dl aria-live="polite" className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
        <DescriptionItem label="Estimated cost" emphasis className="font-mono tabular">
          {formatUsd(estimate.estimateUsd)}
        </DescriptionItem>
        <DescriptionItem label="Budget ceiling" className="font-mono tabular">
          {formatUsd(estimate.budgetUsd)}
        </DescriptionItem>
        <DescriptionItem label="Requests" className="font-mono tabular">
          {formatCount(estimate.requests)}
        </DescriptionItem>
        <DescriptionItem label="Tokens in / out" className="font-mono tabular">
          {formatCount(estimate.inputTokens)} / {formatCount(estimate.outputTokens)}
        </DescriptionItem>
        <DescriptionItem label="Pipeline">
          {estimate.pipeline === 'full' ? 'Full' : 'Lite (fewer requests)'}
        </DescriptionItem>
        <DescriptionItem label="Models" className="font-mono text-compact">
          {modelList(estimate)}
        </DescriptionItem>
      </dl>
      {overCeiling ? (
        <Alert variant="interpretation" role="status">
          <TriangleAlert />
          <AlertDescription>
            The estimate is above your ceiling. Raise the ceiling or choose a cheaper preset.
          </AlertDescription>
        </Alert>
      ) : null}
      <p className="text-xs text-muted-foreground">
        Based on the repository index and catalogue prices. Your provider’s bill can differ.
      </p>
    </div>
  )
}

function modelList(estimate: RunEstimate): string {
  return [estimate.models.planner, estimate.models.author, estimate.models.summarizer]
    .filter((model): model is string => model !== null)
    .join(' · ')
}
