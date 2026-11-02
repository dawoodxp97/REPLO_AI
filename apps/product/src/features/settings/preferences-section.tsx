'use client'

import type { Preferences } from '@replo/contracts'
import { Audience } from '@replo/contracts'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  FieldGroup,
  FormField,
  NativeSelect,
  Skeleton,
} from '@replo/ui'
import { useQuery } from '@tanstack/react-query'
import { InlineError } from '@/components/inline-error'
import { QueryBoundary } from '@/components/query-boundary'
import { orpc } from '@/lib/orpc'
import { AUDIENCE_LABELS } from '@/features/preferences/audience'
import { PreferenceSwitch } from './preference-switch'
import { ThemeField } from './theme-field'
import { usePreferenceUpdate } from './use-preference-update'

function PreferencesForm({ preferences }: { preferences: Preferences }) {
  const { update, withPending, setBrowserNotifications } = usePreferenceUpdate()
  const prefs = withPending(preferences)

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Applies to every screen in this browser.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-xs">
            <ThemeField initial={preferences.theme} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reading</CardTitle>
          <CardDescription>Defaults for every tutorial you read or generate.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup className="gap-5">
            <div className="max-w-xs">
              <FormField id="audience" label="Default audience">
                <NativeSelect
                  id="audience"
                  value={prefs.defaultAudience}
                  onChange={(event) =>
                    update.mutate({
                      defaultAudience:
                        Audience.safeParse(event.target.value).data ?? 'intermediate',
                    })
                  }
                >
                  {Audience.options.map((audience) => (
                    <option key={audience} value={audience}>
                      {AUDIENCE_LABELS[audience]}
                    </option>
                  ))}
                </NativeSelect>
              </FormField>
            </div>
            <PreferenceSwitch
              id="auto-advance"
              label="Open the next lesson automatically"
              description="Moves on when you mark a lesson complete."
              checked={prefs.autoAdvance}
              onChange={(checked) => update.mutate({ autoAdvance: checked })}
            />
            <PreferenceSwitch
              id="quizzes-enabled"
              label="Show the quiz at the end of each lesson"
              description="A short check of what the lesson covered."
              checked={prefs.quizzesEnabled}
              onChange={(checked) => update.mutate({ quizzesEnabled: checked })}
            />
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Generation can take a few minutes.</CardDescription>
        </CardHeader>
        <CardContent>
          <PreferenceSwitch
            id="browser-notifications"
            label="Tell me in this browser when a tutorial is ready"
            description="Your browser asks for permission the first time."
            checked={prefs.browserNotifications}
            onChange={(checked) => void setBrowserNotifications(checked)}
          />
        </CardContent>
      </Card>

      {update.isError ? (
        <InlineError>The preference could not be saved. Try again.</InlineError>
      ) : null}
    </div>
  )
}

export function PreferencesSection() {
  const query = useQuery(orpc.settings.get.queryOptions())

  return (
    <QueryBoundary
      query={query}
      errorTitle="Your preferences could not be loaded"
      loading={<Skeleton aria-busy="true" className="h-64 w-full" />}
    >
      {(preferences) => <PreferencesForm preferences={preferences} />}
    </QueryBoundary>
  )
}
