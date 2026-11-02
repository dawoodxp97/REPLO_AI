'use client'

import { FormField, NativeSelect, Skeleton } from '@replo/ui'
import type { Control } from 'react-hook-form'
import { QueryBoundary } from '@/components/query-boundary'
import { keyOptionLabel, useKeys } from '@/features/keys'
import { fieldInvalid } from '@/lib/field-a11y'
import type { ImportFormValues } from './import-form-values'
import { NoKeysNotice } from './no-keys-notice'
import { useDefaultKeySelection } from './use-default-key-selection'

const KEY_ERROR = 'Choose the key to pay with.'

export function KeyField({ control }: { control: Control<ImportFormValues> }) {
  const keys = useKeys()
  const { value, onChange, hasError } = useDefaultKeySelection(control, keys.data)
  const error = hasError ? KEY_ERROR : undefined

  return (
    <QueryBoundary
      query={keys}
      errorTitle="We could not load your keys"
      loading={<Skeleton aria-busy="true" className="h-9 w-full" />}
    >
      {(saved) =>
        saved.length === 0 ? (
          <NoKeysNotice />
        ) : (
          <FormField
            id="api-key"
            label="Key that pays for this"
            hint="The bill comes from your provider. Replo never charges you."
            error={error}
          >
            <NativeSelect
              id="api-key"
              value={value}
              {...fieldInvalid(error)}
              onChange={(event) => onChange(event.target.value)}
            >
              {saved.map((key) => (
                <option key={key.id} value={key.id}>
                  {keyOptionLabel(key)}
                </option>
              ))}
            </NativeSelect>
          </FormField>
        )
      }
    </QueryBoundary>
  )
}
