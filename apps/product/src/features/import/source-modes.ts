import type { RepositorySource } from '@replo/contracts'
import type { RadioCardOption } from '@/components/radio-card-group'

export type SourceMode = RepositorySource['kind']

export const SOURCE_MODES = [
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

export const MISSING_SOURCE_ERROR = 'Choose a repository to import.'

export interface SourcePickerProps {
  value: RepositorySource | undefined
  onChange: (value: RepositorySource) => void
  missing: boolean
}
