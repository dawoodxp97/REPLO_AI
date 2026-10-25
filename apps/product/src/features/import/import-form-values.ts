import { ImportRepositoryInput } from '@replo/contracts'
import type { DefaultValues } from 'react-hook-form'
import type { z } from 'zod'

export type ImportFormValues = z.input<typeof ImportRepositoryInput>

export const IMPORT_FORM_DEFAULTS: DefaultValues<ImportFormValues> = {
  keyId: '',
  preset: 'balanced',
  audience: 'intermediate',
}
