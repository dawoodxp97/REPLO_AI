'use client'

import { useEffect } from 'react'
import { applyTheme, useThemePreference } from './use-theme-preference'

export function ThemeSync() {
  const { theme } = useThemePreference()

  useEffect(() => {
    if (theme) applyTheme(theme)
  }, [theme])

  return null
}
