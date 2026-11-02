'use client'

import type { PreflightResult, RepositorySource } from '@replo/contracts'
import { Button } from '@replo/ui'
import { useMutation } from '@tanstack/react-query'
import { useEffect } from 'react'
import { InlineError } from '@/components/inline-error'
import { DescriptionItem } from '@/components/description-item'
import { RepoVisibilityBadge } from '@/components/repo-visibility-badge'
import { formatBytes, formatCount, formatRepoName, shortSha } from '@/lib/format'
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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Button
          variant="outline"
          disabled={source === undefined || preflight.isPending}
          onClick={() => {
            if (source) mutate({ source })
          }}
        >
          {preflight.isPending ? 'Checking…' : 'Check repository'}
        </Button>
        <p className="text-compact text-muted-foreground">
          Languages, size and framework, checked before any model is called.
        </p>
      </div>
      {preflight.isError ? <InlineError>{describeImportError(preflight.error)}</InlineError> : null}
      {preflight.data ? <PreflightSummary result={preflight.data} /> : null}
    </div>
  )
}

function PreflightSummary({ result }: { result: PreflightResult }) {
  const { repo, stats } = result
  const languages = Object.entries(stats.languages).sort(([, a], [, b]) => b - a)

  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-4 border-t pt-4 sm:grid-cols-2">
      <DescriptionItem label="Repository">
        <span className="flex flex-wrap items-center gap-2 font-mono">
          {formatRepoName(repo.owner, repo.name)}
          <RepoVisibilityBadge isPrivate={repo.isPrivate} />
        </span>
      </DescriptionItem>
      <DescriptionItem label="Default branch" className="font-mono">
        {repo.defaultBranch}
      </DescriptionItem>
      <DescriptionItem label="Commit" className="font-mono">
        {shortSha(result.commitSha)}
      </DescriptionItem>
      <DescriptionItem label="License">{repo.license ?? 'None found'}</DescriptionItem>
      <DescriptionItem label="Files" className="tabular">
        {formatCount(stats.fileCount)} total, {formatCount(stats.indexableFileCount)} readable for
        tutorials
        {stats.sourceFileCount !== stats.indexableFileCount
          ? ` (${formatCount(stats.sourceFileCount)} primary source)`
          : ''}
      </DescriptionItem>
      <DescriptionItem label="Size" className="tabular">
        {formatBytes(stats.totalBytes)}
      </DescriptionItem>
      <DescriptionItem label="Framework">{stats.framework ?? 'None detected'}</DescriptionItem>
      <DescriptionItem label="Languages" className="tabular">
        {languages.length > 0
          ? languages.map(([language, files]) => `${language} ${formatCount(files)}`).join(' · ')
          : 'None'}
      </DescriptionItem>
    </dl>
  )
}
