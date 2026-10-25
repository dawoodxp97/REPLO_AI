import {
  Alert,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  FormField,
  Select,
  Skeleton,
} from '@replo/ui'
import { useEffect } from 'react'
import { useController, type Control } from 'react-hook-form'
import { LinkButton } from '@/components/link-button'
import { PROVIDER_LABELS, RECOMMENDED_PROVIDER } from '@/features/keys/providers'
import { RecommendedKeyNote } from '@/features/keys/recommended-key-note'
import { useKeys } from '@/features/keys/use-keys'
import type { ImportFormValues } from './import-form-values'

export function KeyField({ control }: { control: Control<ImportFormValues> }) {
  const { field, fieldState } = useController({ control, name: 'keyId' })
  const keys = useKeys()
  const { value, onChange } = field
  const firstKeyId = keys.data?.[0]?.id

  useEffect(() => {
    if (!value && firstKeyId) onChange(firstKeyId)
  }, [value, firstKeyId, onChange])

  if (keys.isPending) return <Skeleton aria-busy="true" className="h-11 w-full" />

  if (keys.isError) {
    return (
      <Alert tone="destructive" role="alert">
        We could not load your keys. Reload the page and try again.
      </Alert>
    )
  }

  if (keys.data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add an API key first</CardTitle>
          <CardDescription>A tutorial cannot start without a key to pay for it.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RecommendedKeyNote />
          <LinkButton href="/settings/keys" variant="outline">
            Add a key
          </LinkButton>
        </CardContent>
      </Card>
    )
  }

  return (
    <FormField
      id="api-key"
      label="Key that pays for this"
      hint="The bill comes from your provider. Replo never charges you."
      error={fieldState.error ? 'Choose the key to pay with.' : undefined}
    >
      <Select
        id="api-key"
        value={value}
        aria-invalid={fieldState.error ? true : undefined}
        onChange={(event) => onChange(event.target.value)}
      >
        {keys.data.map((key) => (
          <option key={key.id} value={key.id}>
            {PROVIDER_LABELS[key.provider]}
            {key.provider === RECOMMENDED_PROVIDER ? ' (recommended)' : ''} · {key.label} · …
            {key.last4}
          </option>
        ))}
      </Select>
    </FormField>
  )
}
