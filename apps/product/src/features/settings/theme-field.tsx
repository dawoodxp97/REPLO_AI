'use client'

import { Theme } from '@replo/contracts'
import { FormField, NativeSelect } from '@replo/ui'
import { useState } from 'react'
import { useThemePreference } from '@/features/session/use-theme-preference'
import { THEME_LABELS } from './preference-labels'

export function ThemeField({ initial }: { initial: Theme }) {
  const { setTheme } = useThemePreference()
  const [value, setValue] = useState(initial)

  function change(raw: string) {
    const next = Theme.safeParse(raw).data ?? 'system'
    setValue(next)
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
