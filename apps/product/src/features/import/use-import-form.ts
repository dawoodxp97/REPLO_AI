'use client'

import { ImportRepositoryInput, RepositorySource } from '@replo/contracts'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
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
  preset: 'balanced',
  audience: 'intermediate',
}

const ESTIMATE_DEBOUNCE_MS = 400

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
    if (!keep('preset')) {
      const { preset, customModels } = models.data
      if (preset !== 'custom' || customModels) setValue('preset', preset)
      if (preset === 'custom' && customModels) setValue('customModels', customModels)
    }
    if (!keep('budgetUsd') && models.data.defaultBudgetUsd !== null) {
      setValue('budgetUsd', models.data.defaultBudgetUsd)
    }
  }, [settings.data, models.data, setValue, getFieldState, formState])
}

export function useImportPlan(control: Control<ImportFormValues>) {
  const values = useWatch({ control })
  const settledValues = useDebouncedValue(values, ESTIMATE_DEBOUNCE_MS)

  const plan = ImportRepositoryInput.safeParse(values)
  const source = RepositorySource.safeParse(values.source)
  const settledPlan = useMemo(() => ImportRepositoryInput.safeParse(settledValues), [settledValues])

  const settling = plan.success && settledValues !== values

  return {
    canSubmit: plan.success,
    blocker: importBlocker(values),
    source: source.success ? source.data : undefined,
    estimateInput: plan.success && settledPlan.success ? settledPlan.data : undefined,
    settling,
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
