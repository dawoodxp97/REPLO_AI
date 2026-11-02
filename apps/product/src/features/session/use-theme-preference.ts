'use client'

import type { Theme } from '@replo/contracts'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { orpc } from '@/lib/orpc'

export function applyTheme(theme: Theme) {
  const root = document.documentElement
  if (theme === 'system') delete root.dataset.theme
  else root.dataset.theme = theme
}

export function useThemePreference() {
  const settings = useQuery(orpc.settings.get.queryOptions())
  const queryClient = useQueryClient()
  const update = useMutation(
    orpc.settings.update.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.settings.key() }),
    }),
  )

  function setTheme(theme: Theme) {
    applyTheme(theme)
    update.mutate({ theme })
  }

  return { theme: settings.data?.theme, setTheme }
}
