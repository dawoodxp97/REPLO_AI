'use client'

import { Theme } from '@replo/contracts'
import { FormField, NativeSelect } from '@replo/ui'
import { useThemePreference } from '@/features/session/use-theme-preference'
import { THEME_LABELS } from './preference-labels'

export function ThemeField({ initial }: { initial: Theme }) {
  const { theme, setTheme } = useThemePreference()
  const value = theme ?? initial

  function change(raw: string) {
    const next = Theme.safeParse(raw).data ?? 'system'
    setTheme(next)
  }

  return (
    <FormField id="theme" label="Theme" hint="System follows your operating system setting.">
      <NativeSelect id="theme" value={value} onChange={(event) => change(event.target.value)}>
        {Theme.options.map((theme) => (
          <option key={theme} value={theme}>
            {THEME_LABELS[theme]}
          </option>
        ))}
      </NativeSelect>
    </FormField>
  )
}
