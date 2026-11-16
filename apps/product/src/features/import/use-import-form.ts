'use client'

import { ImportRepositoryInput, RepositorySource } from '@replo/contracts'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useWatch, type Control, type DefaultValues, type UseFormReturn } from 'react-hook-form'
import type { z } from 'zod'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { invalidateGenerationQueries } from '@/lib/generation-cache'
import { createIdempotencyKeys } from '@/lib/idempotency-key'
import { client, orpc } from '@/lib/orpc'
import { importBlocker } from './import-blocker'

export type ImportFormValues = z.input<typeof ImportRepositoryInput>

export const IMPORT_FORM_DEFAULTS: DefaultValues<ImportFormValues> = {
  keyId: '',
  modelId: '',
  audience: 'intermediate',
}

export function useImportDefaults(
  form: Pick<
    UseFormReturn<ImportFormValues, unknown, ImportRepositoryInput>,
    'setValue' | 'getFieldState' | 'formState'
  >,
) {
  const settings = useQuery(orpc.settings.get.queryOptions())
  const models = useQuery(orpc.models.getPreferences.queryOptions())
  const applied = useRef(false)
  const { setValue, getFieldState, formState } = form

  useEffect(() => {
    if (applied.current || !settings.data || !models.data) return
    applied.current = true
    const keep = (name: keyof ImportFormValues) => getFieldState(name, formState).isDirty
    if (!keep('audience')) setValue('audience', settings.data.defaultAudience)
    if (!keep('modelId') && models.data.defaultModel !== null) {
      setValue('modelId', models.data.defaultModel)
    }
  }, [settings.data, models.data, setValue, getFieldState, formState])
}

export function useImportPlan(control: Control<ImportFormValues>) {
  const values = useWatch({ control })
  const settledValues = useDebouncedValue(values, 400)

  const plan = ImportRepositoryInput.safeParse(values)
  const source = RepositorySource.safeParse(values.source)

  return {
    canSubmit: plan.success,
    blocker: importBlocker(values),
    source: source.success ? source.data : undefined,
    settling: plan.success && settledValues !== values,
  }
}

export function useStartImport() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [idempotencyKeys] = useState(createIdempotencyKeys)

  return useMutation({
    mutationFn: (input: ImportRepositoryInput) =>
      client.repositories.import(input, {
        context: { idempotencyKey: idempotencyKeys.keyFor(input) },
      }),
    onSuccess: (job) => {
      router.push(`/jobs/${job.jobId}`)
      void invalidateGenerationQueries(queryClient)
    },
  })
}
