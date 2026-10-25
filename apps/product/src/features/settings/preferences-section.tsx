'use client'

import type { Preferences } from '@replo/contracts'
import {
  Alert,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  FormField,
  Select,
  Skeleton,
} from '@replo/ui'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ErrorPanel } from '@/components/error-panel'
import { orpc } from '@/lib/orpc'

const AUDIENCE_LABELS: Record<Preferences['defaultAudience'], string> = {
  newcomer: 'Newcomer',
  intermediate: 'Intermediate',
  expert: 'Expert',
}

const AUDIENCES: readonly Preferences['defaultAudience'][] = ['newcomer', 'intermediate', 'expert']

export function PreferencesSection() {
  const settings = useQuery(orpc.settings.get.queryOptions())
  const queryClient = useQueryClient()
  const update = useMutation(
    orpc.settings.update.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.settings.key() }),
    }),
  )

  if (settings.isPending) return <Skeleton aria-busy="true" className="h-64 w-full" />
  if (settings.isError || !settings.data) {
    return (
      <ErrorPanel
        title="We could not load your preferences"
        description="Check your connection, then reload."
      />
    )
  }

  const prefs = settings.data

  async function setBrowserNotifications(enabled: boolean) {
    if (enabled && 'Notification' in window && Notification.permission !== 'granted') {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') return
    }
    update.mutate({ browserNotifications: enabled })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reading</CardTitle>
          <CardDescription>Applies to every tutorial you read or generate.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField id="theme" label="Theme">
              <Select
                id="theme"
                value={prefs.theme}
                onChange={(event) =>
                  update.mutate({ theme: event.target.value === 'dark' ? 'dark' : 'light' })
                }
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </Select>
            </FormField>
            <FormField id="audience" label="Default audience">
              <Select
                id="audience"
                value={prefs.defaultAudience}
                onChange={(event) =>
                  update.mutate({ defaultAudience: parseAudience(event.target.value) })
                }
              >
                {AUDIENCES.map((audience) => (
                  <option key={audience} value={audience}>
                    {AUDIENCE_LABELS[audience]}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>
          <Toggle
            label="Open the next lesson when I mark one complete"
            checked={prefs.autoAdvance}
            onChange={(checked) => update.mutate({ autoAdvance: checked })}
          />
          <Toggle
            label="Show the check-your-understanding quiz at the end of each lesson"
            checked={prefs.quizzesEnabled}
            onChange={(checked) => update.mutate({ quizzesEnabled: checked })}
          />
          <Toggle
            label="Tell me in this browser when a tutorial is ready"
            checked={prefs.browserNotifications}
            onChange={(checked) => void setBrowserNotifications(checked)}
          />
          {update.isError ? (
            <Alert tone="destructive" role="alert">
              The preference could not be saved. Try again.
            </Alert>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-4 accent-primary"
      />
      {label}
    </label>
  )
}

function parseAudience(value: string): Preferences['defaultAudience'] {
  if (value === 'newcomer' || value === 'expert') return value
  return 'intermediate'
}
