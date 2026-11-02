import { RepositorySource } from '@replo/contracts'
import { FormField, Input } from '@replo/ui'
import { fieldInvalid } from '@/lib/field-a11y'
import { MISSING_SOURCE_ERROR, type SourcePickerProps } from './source-modes'

const URL_ERROR = 'Use a link such as https://github.com/owner/repo'

export function PublicUrlField({ value, onChange, missing }: SourcePickerProps) {
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
        {...fieldInvalid(error)}
        value={url}
        onChange={(event) => onChange({ kind: 'public_url', url: event.target.value.trim() })}
      />
    </FormField>
  )
}
