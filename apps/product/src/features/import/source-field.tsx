import { RepositorySource } from '@replo/contracts'
import { Alert, FormField, Input, Select, Skeleton } from '@replo/ui'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useController, type Control } from 'react-hook-form'
import { LinkButton } from '@/components/link-button'
import { RadioCardGroup, type RadioCardOption } from '@/components/radio-card-group'
import { orpc } from '@/lib/orpc'
import type { ImportFormValues } from './import-form-values'

type SourceMode = 'public_url' | 'installation'

const SOURCE_MODES = [
  {
    value: 'public_url',
    title: 'Public URL',
    description: 'Paste the link to a public repository on github.com.',
  },
  {
    value: 'installation',
    title: 'My GitHub App repos',
    description: 'Pick a repository the Replo GitHub App can read.',
  },
] as const satisfies readonly RadioCardOption<SourceMode>[]

const URL_ERROR = 'Use a link such as https://github.com/owner/repo'
const MISSING_SOURCE_ERROR = 'Choose a repository to import.'

export function SourceField({ control }: { control: Control<ImportFormValues> }) {
  const { field, fieldState } = useController({ control, name: 'source' })
  const [mode, setMode] = useState<SourceMode>(
    field.value?.kind === 'installation' ? 'installation' : 'public_url',
  )

  function chooseMode(next: SourceMode) {
    setMode(next)
    field.onChange(undefined)
  }

  return (
    <section className="space-y-4">
      <RadioCardGroup
        name="source-mode"
        legend="Where is the repository?"
        options={SOURCE_MODES}
        value={mode}
        onChange={chooseMode}
      />
      {mode === 'public_url' ? (
        <PublicUrlField
          value={field.value}
          onChange={field.onChange}
          missing={fieldState.error !== undefined && !field.value}
        />
      ) : (
        <InstallationPicker
          value={field.value}
          onChange={field.onChange}
          missing={fieldState.error !== undefined && !field.value}
        />
      )}
    </section>
  )
}

interface PublicUrlFieldProps {
  value: RepositorySource | undefined
  onChange: (value: RepositorySource) => void
  missing: boolean
}

function PublicUrlField({ value, onChange, missing }: PublicUrlFieldProps) {
  const url = value?.kind === 'public_url' ? value.url : ''
  const malformed = url !== '' && !RepositorySource.safeParse({ kind: 'public_url', url }).success
  const error = malformed ? URL_ERROR : missing ? MISSING_SOURCE_ERROR : undefined

  return (
    <FormField
      id="repo-url"
      label="GitHub repository URL"
      hint="Public repositories only. Private repositories need the GitHub App."
      error={error}
    >
      <Input
        id="repo-url"
        type="url"
        inputMode="url"
        autoComplete="off"
        spellCheck={false}
        placeholder="https://github.com/owner/repo"
        aria-invalid={error !== undefined || undefined}
        value={url}
        onChange={(event) => onChange({ kind: 'public_url', url: event.target.value.trim() })}
      />
    </FormField>
  )
}

interface InstallationPickerProps {
  value: RepositorySource | undefined
  onChange: (value: RepositorySource) => void
  missing: boolean
}

function InstallationPicker({ value, onChange, missing }: InstallationPickerProps) {
  const repositories = useQuery(orpc.github.listRepos.queryOptions())
  const installUrl = useQuery(orpc.github.installUrl.queryOptions())
  const selectedId = value?.kind === 'installation' ? String(value.githubRepoId) : ''

  if (repositories.isPending) return <Skeleton aria-busy="true" className="h-11 w-full" />

  if (repositories.isError) {
    return (
      <Alert tone="destructive" role="alert">
        We could not load your GitHub App repositories. Try again in a moment.
      </Alert>
    )
  }

  const installHref = installUrl.data?.url ?? null

  if (repositories.data.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {installHref
            ? 'The GitHub App has no repositories for your account yet.'
            : 'Private repositories need the Replo GitHub App on this server. It is not configured in development yet — use a public URL instead.'}
        </p>
        {installHref ? (
          <LinkButton href={installHref} variant="outline">
            Install the GitHub App
          </LinkButton>
        ) : null}
      </div>
    )
  }

  return (
    <FormField
      id="installation-repo"
      label="Repository"
      hint="Need a different one? Change its access in GitHub, then return here."
      error={missing ? MISSING_SOURCE_ERROR : undefined}
    >
      <Select
        id="installation-repo"
        value={selectedId}
        aria-invalid={missing || undefined}
        onChange={(event) => {
          const githubRepoId = Number(event.target.value)
          if (githubRepoId > 0) onChange({ kind: 'installation', githubRepoId })
        }}
      >
        <option value="" disabled>
          Choose a repository
        </option>
        {repositories.data.map((repository) => (
          <option key={repository.githubRepoId} value={repository.githubRepoId}>
            {repository.owner}/{repository.name}
            {repository.isPrivate ? ' (private)' : ''}
          </option>
        ))}
      </Select>
    </FormField>
  )
}
