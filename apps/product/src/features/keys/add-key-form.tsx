import { zodResolver } from '@hookform/resolvers/zod'
import { AddKeyInput, PROVIDERS } from '@replo/contracts'
import { Alert, Button, FormField, Input, Select } from '@replo/ui'
import { useForm } from 'react-hook-form'
import { PROVIDER_LABELS, RECOMMENDED_PROVIDER } from './providers'
import { describeKeyError } from './key-errors'
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

  return (
    <form
      noValidate
      className="space-y-5"
      onSubmit={form.handleSubmit((input) =>
        addKey.mutate(input, { onSuccess: () => form.resetField('apiKey') }),
      )}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField id="key-provider" label="Provider">
          <Select id="key-provider" {...form.register('provider')}>
            {PROVIDERS.map((provider) => (
              <option key={provider} value={provider}>
                {PROVIDER_LABELS[provider]}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField
          id="key-label"
          label="Label"
          hint="Only you see this name."
          error={form.formState.errors.label ? 'Enter a label of up to 64 characters.' : undefined}
        >
          <Input id="key-label" autoComplete="off" {...form.register('label')} />
        </FormField>
      </div>
      <FormField
        id="key-value"
        label="API key"
        hint="Stored encrypted. Afterwards it is shown only as …last4."
        error={form.formState.errors.apiKey ? 'Paste the full key from your provider.' : undefined}
      >
        <Input
          id="key-value"
          type="password"
          autoComplete="off"
          spellCheck={false}
          aria-invalid={form.formState.errors.apiKey ? true : undefined}
          {...form.register('apiKey')}
        />
      </FormField>
      {addKey.isError ? (
        <Alert tone="destructive" role="alert">
          {describeKeyError(addKey.error)}
        </Alert>
      ) : null}
      <Button type="submit" disabled={addKey.isPending}>
        {addKey.isPending ? 'Checking key…' : 'Save key'}
      </Button>
    </form>
  )
}
