'use client'

import type { ImportRepositoryInput } from '@replo/contracts'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { orpc } from '@/lib/orpc'
import type { ImportFormValues } from './import-form-values'

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
