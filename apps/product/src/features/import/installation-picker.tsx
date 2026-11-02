import { FormField, NativeSelect, Skeleton } from '@replo/ui'
import { LinkButton } from '@/components/link-button'
import { QueryBoundary } from '@/components/query-boundary'
import { fieldInvalid } from '@/lib/field-a11y'
import { MISSING_SOURCE_ERROR, type SourcePickerProps } from './source-modes'
import { useInstallationRepos } from './use-installation-repos'

export function InstallationPicker({ value, onChange, missing }: SourcePickerProps) {
  const { repositories, installHref } = useInstallationRepos()
  const selectedId = value?.kind === 'installation' ? String(value.githubRepoId) : ''
  const error = missing ? MISSING_SOURCE_ERROR : undefined

  return (
    <QueryBoundary
      query={repositories}
      errorTitle="We could not load your GitHub App repositories"
      errorDescription="Try again in a moment."
      loading={<Skeleton aria-busy="true" className="h-9 w-full" />}
    >
      {(items) =>
        items.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {installHref
                ? 'The GitHub App has no repositories for your account yet.'
                : 'The Replo GitHub App is not configured on this server. Use a public URL instead.'}
            </p>
            {installHref ? (
              <LinkButton href={installHref} variant="outline">
                Install the GitHub App
              </LinkButton>
            ) : null}
          </div>
        ) : (
          <FormField
            id="installation-repo"
            label="Repository"
            hint="Need a different one? Change its access in GitHub, then return here."
            error={error}
          >
            <NativeSelect
              id="installation-repo"
              value={selectedId}
              {...fieldInvalid(error)}
              onChange={(event) => {
                const githubRepoId = Number(event.target.value)
                if (githubRepoId > 0) onChange({ kind: 'installation', githubRepoId })
              }}
            >
              <option value="" disabled>
                Choose a repository
              </option>
              {items.map((repository) => (
                <option key={repository.githubRepoId} value={repository.githubRepoId}>
                  {repository.owner}/{repository.name}
                  {repository.isPrivate ? ' (private)' : ''}
                </option>
              ))}
            </NativeSelect>
          </FormField>
        )
      }
    </QueryBoundary>
  )
}
