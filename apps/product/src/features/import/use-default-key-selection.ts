import type { KeyDto } from '@replo/contracts'
import { useEffect } from 'react'
import { useController, type Control } from 'react-hook-form'
import type { ImportFormValues } from './import-form-values'

export function useDefaultKeySelection(
  control: Control<ImportFormValues>,
  keys: readonly KeyDto[] | undefined,
) {
  const { field, fieldState } = useController({ control, name: 'keyId' })
  const { value, onChange } = field
  const firstKeyId = keys?.[0]?.id

  useEffect(() => {
    if (!value && firstKeyId) onChange(firstKeyId)
  }, [value, firstKeyId, onChange])

  return { value, onChange, hasError: fieldState.error !== undefined }
}
