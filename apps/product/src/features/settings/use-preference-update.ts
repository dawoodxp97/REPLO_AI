'use client'

import type { Preferences } from '@replo/contracts'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { orpc } from '@/lib/orpc'

export function usePreferenceUpdate() {
  const queryClient = useQueryClient()
  const update = useMutation(
    orpc.settings.update.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.settings.key() }),
    }),
  )

  function withPending(preferences: Preferences): Preferences {
    return update.isPending && update.variables
      ? { ...preferences, ...update.variables }
      : preferences
  }

  async function setBrowserNotifications(enabled: boolean) {
    if (enabled && 'Notification' in window && Notification.permission !== 'granted') {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') return
    }
    update.mutate({ browserNotifications: enabled })
  }

  return { update, withPending, setBrowserNotifications }
}
