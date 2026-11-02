'use client'

import type { Theme } from '@replo/contracts'
import { useQuery } from '@tanstack/react-query'
import { usePreferenceUpdate } from '@/features/settings/use-preference-update'
import { orpc } from '@/lib/orpc'

export function applyTheme(theme: Theme) {
  const root = document.documentElement
  if (theme === 'system') delete root.dataset.theme
  else root.dataset.theme = theme
}

export function useThemePreference() {
  const settings = useQuery(orpc.settings.get.queryOptions())
  const { update } = usePreferenceUpdate()

  function setTheme(theme: Theme) {
    applyTheme(theme)
    update.mutate({ theme })
  }

  const pendingTheme = update.isPending ? update.variables?.theme : undefined

  return { theme: pendingTheme ?? settings.data?.theme, setTheme }
}
