'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@replo/ui'
import { ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { StatusDot, type StatusTone } from '@/components/status-dot'
import { keyMask } from '@/features/keys/format-key-label'
import { LLM_PROVIDER_LABELS } from '@/features/keys/providers'
import { useWorkspaceSetup, type WorkspaceSetup } from '@/features/session/use-workspace-setup'
import { settingsPath, type SettingsSection } from '@/features/settings/sections'
import { capitalize, formatCount, formatUsd } from '@/lib/format'

interface SetupRow {
  section: SettingsSection
  label: string
  value: string
  tone: StatusTone
}

const LOADING = { value: 'Checking…', tone: 'neutral' } as const

function keyRow(keys: WorkspaceSetup['keys']): Pick<SetupRow, 'value' | 'tone'> {
  if (!keys) return LOADING
  const [first, ...rest] = keys
  if (!first) return { value: 'Add a key to generate tutorials', tone: 'attention' }
  const more = rest.length > 0 ? ` and ${formatCount(rest.length)} more` : ''
  return { value: `${LLM_PROVIDER_LABELS[first.provider]} ${keyMask(first)}${more}`, tone: 'ready' }
}

function githubRow(linked: WorkspaceSetup['githubLinked']): Pick<SetupRow, 'value' | 'tone'> {
  if (linked === undefined) return LOADING
  return linked
    ? { value: 'Connected', tone: 'ready' }
    : { value: 'Not connected. Public repositories only', tone: 'neutral' }
}

function modelsRow(setup: WorkspaceSetup): Pick<SetupRow, 'value' | 'tone'> {
  if (!setup.preset) return LOADING
  const budget = setup.defaultBudgetUsd ? `, ${formatUsd(setup.defaultBudgetUsd)} budget` : ''
  return { value: `${capitalize(setup.preset)} preset${budget}`, tone: 'ready' }
}

function setupRows(setup: WorkspaceSetup): SetupRow[] {
  return [
    { section: 'keys', label: 'API key', ...keyRow(setup.keys) },
    { section: 'github', label: 'GitHub', ...githubRow(setup.githubLinked) },
    { section: 'models', label: 'Models', ...modelsRow(setup) },
  ]
}

export function WorkspaceCard() {
  const rows = setupRows(useWorkspaceSetup())

  return (
    <Card className="gap-3">
      <CardHeader>
        <CardTitle>Workspace</CardTitle>
        <CardDescription className="text-compact">What a new tutorial will run on.</CardDescription>
      </CardHeader>
      <CardContent className="px-2.5">
        <ul>
          {rows.map((row) => (
            <li key={row.section}>
              <Link
                href={settingsPath(row.section)}
                className="flex items-center gap-3 rounded-md px-2.5 py-2 transition-colors hover:bg-accent focus-visible:-outline-offset-2"
              >
                <StatusDot tone={row.tone} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{row.label}</span>
                  <span className="block truncate text-xs text-muted-foreground">{row.value}</span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
