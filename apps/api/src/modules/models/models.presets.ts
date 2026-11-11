import { MICROS_PER_USD, type ModelPreferences, type PresetInfo } from '@replo/contracts'
import { PRESET_ROUTING, type Preset } from '@replo/ai'

export const PRESET_COPY: Record<Preset, { label: string; description: string }> = {
  free: {
    label: 'Free',
    description:
      'Free OpenRouter models that passed our quality checks. Needs an OpenRouter key. Lite pipeline.',
  },
  budget: { label: 'Budget', description: 'Cheapest tier for every role. Lite pipeline.' },
  balanced: {
    label: 'Balanced',
    description: 'Mid tier for planning and writing, cheapest tier for summaries.',
  },
  quality: { label: 'Quality', description: 'Frontier tier for planning, mid tier for writing.' },
  custom: {
    label: 'Custom',
    description: 'Pick a catalogue model per role; models must advertise structured output.',
  },
}

export const presetRouting = (preset: Preset): PresetInfo['routing'] => {
  if (preset === 'free') return { planner: 'free', author: 'free', summarizer: null }
  if (preset === 'custom') return { planner: null, author: null, summarizer: null }
  return PRESET_ROUTING[preset]
}

export const DEFAULT_PREFERENCES: ModelPreferences = {
  preset: 'balanced',
  customModels: null,
  defaultBudgetUsd: null,
}

export const toPreferencesDto = (row: {
  preset: ModelPreferences['preset']
  customModels: ModelPreferences['customModels']
  defaultBudgetMicros: number | null
}): ModelPreferences => ({
  preset: row.preset,
  customModels: row.customModels,
  defaultBudgetUsd:
    row.defaultBudgetMicros === null ? null : row.defaultBudgetMicros / MICROS_PER_USD,
})
