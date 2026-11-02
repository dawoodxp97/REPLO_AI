'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { AddKeyInput, PROVIDERS } from '@replo/contracts'
import { Button, FieldGroup, FormField, NativeSelect } from '@replo/ui'
import { useForm } from 'react-hook-form'
import { InlineError } from '@/components/inline-error'
import { TextField } from '@/components/text-field'
import { describeKeyError } from './key-errors'
import { LLM_PROVIDER_LABELS, RECOMMENDED_PROVIDER } from './providers'
import { useAddKey } from './use-keys'

const ADD_KEY_DEFAULTS: AddKeyInput = {
  provider: RECOMMENDED_PROVIDER,
  label: 'default',
  apiKey: '',
}

export function AddKeyForm() {
  const addKey = useAddKey()
  const form = useForm({
    resolver: zodResolver(AddKeyInput),
    defaultValues: ADD_KEY_DEFAULTS,
  })
  const { errors } = form.formState
  const labelError = errors.label ? 'Enter a label of up to 64 characters.' : undefined
  const apiKeyError = errors.apiKey ? 'Paste the full key from your provider.' : undefined

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit((input) =>
        addKey.mutate(input, { onSuccess: () => form.resetField('apiKey') }),
      )}
    >
      <FieldGroup className="gap-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField id="key-provider" label="Provider">
            <NativeSelect id="key-provider" {...form.register('provider')}>
              {PROVIDERS.map((provider) => (
                <option key={provider} value={provider}>
                  {LLM_PROVIDER_LABELS[provider]}
                </option>
              ))}
            </NativeSelect>
          </FormField>
          <TextField
            id="key-label"
            label="Label"
            hint="Only you see this name."
            error={labelError}
            autoComplete="off"
            {...form.register('label')}
          />
        </div>
        <TextField
          id="key-value"
          label="API key"
          hint="Stored encrypted. Afterwards it is shown only as …last4."
          error={apiKeyError}
          type="password"
          autoComplete="off"
          spellCheck={false}
          {...form.register('apiKey')}
        />
        {addKey.isError ? <InlineError>{describeKeyError(addKey.error)}</InlineError> : null}
        <div>
          <Button type="submit" disabled={addKey.isPending}>
            {addKey.isPending ? 'Checking key…' : 'Save key'}
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}
