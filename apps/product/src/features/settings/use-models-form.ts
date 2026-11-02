'use client'

import type { CustomModels, ModelPreferences } from '@replo/contracts'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { orpc } from '@/lib/orpc'

export function useModelsForm(initial: ModelPreferences) {
  const queryClient = useQueryClient()
  const save = useMutation(
    orpc.models.setPreferences.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.models.key() }),
    }),
  )
  const { reset: resetSave } = save
  const [preset, setPresetValue] = useState(initial.preset)
  const [budget, setBudgetValue] = useState(
    initial.defaultBudgetUsd === null ? '' : String(initial.defaultBudgetUsd),
  )
  const [custom, setCustomValue] = useState<CustomModels>(initial.customModels ?? {})

  function setPreset(next: ModelPreferences['preset']) {
    resetSave()
    setPresetValue(next)
  }

  function setBudget(next: string) {
    resetSave()
    setBudgetValue(next)
  }

  function setCustomModel(role: keyof CustomModels, modelId: string) {
    resetSave()
    setCustomValue((current) => ({ ...current, [role]: modelId === '' ? undefined : modelId }))
  }

  function submit() {
    const trimmed = budget.trim()
    save.mutate({
      preset,
      customModels: preset === 'custom' ? custom : null,
      defaultBudgetUsd: trimmed === '' ? null : Number(trimmed),
    })
  }

  return { preset, budget, custom, setPreset, setBudget, setCustomModel, save, submit }
}
