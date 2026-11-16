'use client'

import type { ModelCatalog, ModelPreferences } from '@replo/contracts'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  FieldGroup,
  FormField,
  NativeSelect,
} from '@replo/ui'
import { InlineError } from '@/components/inline-error'
import { LLM_PROVIDER_LABELS } from '@/features/keys/providers'
import { createErrorDescriber } from '@/lib/error-copy'
import { useModelsForm } from './use-models-form'

const describeModelError = createErrorDescriber({
  MODEL_NOT_ALLOWED: 'That model is not verified for this product. Pick another one.',
  BAD_REQUEST: 'Pick a model from the list.',
})

export function ModelsForm({
  catalog,
  initial,
}: {
  catalog: ModelCatalog
  initial: ModelPreferences
}) {
  const form = useModelsForm(initial)
  const { save } = form
  const verified = catalog.models.filter(
    (model) => model.verified && model.supportsStructuredOutput,
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Default model</CardTitle>
        <CardDescription>
          The model pre-filled for every new course. You can change it per course at import.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup className="gap-5">
          <FormField id="default-model" label="Model">
            <NativeSelect
              id="default-model"
              value={form.model}
              onChange={(event) => form.setModel(event.target.value)}
            >
              <option value="">No default — choose per course</option>
              {verified.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.label} · {LLM_PROVIDER_LABELS[model.provider]}
                  {model.free ? ' · free' : ''}
                </option>
              ))}
            </NativeSelect>
          </FormField>

          {save.isError ? <InlineError>{describeModelError(save.error)}</InlineError> : null}
        </FieldGroup>
      </CardContent>
      <CardFooter className="gap-3">
        <Button disabled={save.isPending} onClick={form.submit}>
          {save.isPending ? 'Saving…' : 'Save model'}
        </Button>
        {save.isSuccess ? (
          <span role="status" className="text-sm text-muted-foreground">
            Saved.
          </span>
        ) : null}
      </CardFooter>
    </Card>
  )
}
