'use client'

import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { orpc } from '@/lib/orpc'

export function ThemeSync() {
  const settings = useQuery(orpc.settings.get.queryOptions())
  const theme = settings.data?.theme

  useEffect(() => {
    if (theme) document.documentElement.dataset.theme = theme
  }, [theme])

  return null
}
