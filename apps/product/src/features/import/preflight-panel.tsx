import type { PreflightResult, RepositorySource } from '@replo/contracts'
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@replo/ui'
import { useMutation } from '@tanstack/react-query'
import { useEffect, type ReactNode } from 'react'
import { formatBytes, formatCount } from '@/lib/format'
import { orpc } from '@/lib/orpc'
import { describeImportError } from './import-errors'

export function PreflightPanel({ source }: { source: RepositorySource | undefined }) {
  const preflight = useMutation(orpc.repositories.preflight.mutationOptions())
  const { mutate, reset } = preflight
  const sourceKey = JSON.stringify(source)

  useEffect(() => {
    reset()
  }, [sourceKey, reset])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Pre-flight</CardTitle>
        <CardDescription>
          Languages, size and framework, checked before any model is called.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Button
            variant="outline"
            disabled={source === undefined || preflight.isPending}
            onClick={() => {
              if (source) mutate({ source })
            }}
          >
            {preflight.isPending ? 'Checking…' : 'Check repository'}
          </Button>
        </div>
        {preflight.isError ? (
          <Alert tone="destructive" role="alert">
            {describeImportError(preflight.error)}
          </Alert>
        ) : null}
        {preflight.data ? <PreflightSummary result={preflight.data} /> : null}
      </CardContent>
    </Card>
  )
}

function PreflightSummary({ result }: { result: PreflightResult }) {
  const languages = Object.entries(result.stats.languages).sort(([, a], [, b]) => b - a)

  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
      <SummaryRow label="Repository">
        <span className="flex flex-wrap items-center gap-2 font-mono">
          {result.repo.owner}/{result.repo.name}
          <Badge variant={result.repo.isPrivate ? 'interpretation' : 'neutral'}>
            {result.repo.isPrivate ? 'Private' : 'Public'}
          </Badge>
        </span>
      </SummaryRow>
      <SummaryRow label="Default branch">{result.repo.defaultBranch}</SummaryRow>
      <SummaryRow label="Commit">
        <span className="font-mono">{result.commitSha.slice(0, 7)}</span>
      </SummaryRow>
      <SummaryRow label="License">{result.repo.license ?? 'None found'}</SummaryRow>
      <SummaryRow label="Files">
        {formatCount(result.stats.fileCount)} total, {formatCount(result.stats.sourceFileCount)}{' '}
        source
      </SummaryRow>
      <SummaryRow label="Size">{formatBytes(result.stats.totalBytes)}</SummaryRow>
      <SummaryRow label="Framework">{result.stats.framework ?? 'None detected'}</SummaryRow>
      <SummaryRow label="Languages">
        {languages.length > 0
          ? languages.map(([language, files]) => `${language} ${formatCount(files)}`).join(' · ')
          : 'None'}
      </SummaryRow>
    </dl>
  )
}

function SummaryRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="break-words">{children}</dd>
    </div>
  )
}
