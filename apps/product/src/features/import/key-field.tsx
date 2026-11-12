'use client'

import type { KeyDto } from '@replo/contracts'
import { Alert, AlertDescription, AlertTitle, FormField, NativeSelect, Skeleton } from '@replo/ui'
import { KeyRound } from 'lucide-react'
import { useEffect } from 'react'
import { useController, type Control } from 'react-hook-form'
import { LinkButton } from '@/components/link-button'
import { QueryBoundary } from '@/components/query-boundary'
import { keyOptionLabel, RecommendedKeyNote, useKeys } from '@/features/keys'
import { fieldInvalid } from '@/lib/field-a11y'
import type { ImportFormValues } from './use-import-form'

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

function useDefaultKeySelection(
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

function NoKeysNotice() {
  return (
    <Alert variant="interpretation">
      <KeyRound />
      <AlertTitle>Add an API key first</AlertTitle>
      <AlertDescription>
        <p>A tutorial cannot start without a key to pay for it.</p>
        <RecommendedKeyNote />
        <LinkButton href="/settings/keys" variant="outline" size="sm" className="mt-1">
          Add a key
        </LinkButton>
      </AlertDescription>
    </Alert>
  )
}
