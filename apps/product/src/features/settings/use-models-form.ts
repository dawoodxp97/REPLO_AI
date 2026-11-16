'use client'

import type { ModelPreferences } from '@replo/contracts'
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
  const [model, setModelValue] = useState(initial.defaultModel ?? '')

  function setModel(next: string) {
    save.reset()
    setModelValue(next)
  }

  function submit() {
    save.mutate({ defaultModel: model === '' ? null : model })
  }

  return { model, setModel, save, submit }
}
