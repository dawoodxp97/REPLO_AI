'use client'

import { formatCount } from '@/lib/format'
import { useDashboardSummary } from './use-dashboard'

export function WorkspaceTotals() {
  const summary = useDashboardSummary()
  if (!summary.data) return null
  const { repositories, generations, total } = summary.data.counts

  return (
    <p className="text-sm text-muted-foreground">
      <span className="tabular font-mono">{formatCount(repositories)}</span> repositories ·{' '}
      <span className="tabular font-mono">{formatCount(generations)}</span> generations ·{' '}
      <span className="tabular font-mono">{formatCount(total)}</span> courses
    </p>
  )
}
