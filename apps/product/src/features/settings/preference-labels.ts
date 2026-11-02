import type { Audience, Theme } from '@replo/contracts'

export const THEME_LABELS: Record<Theme, string> = {
  system: 'System',
  light: 'Light',
  dark: 'Dark',
}

export const AUDIENCE_LABELS: Record<Audience, string> = {
  newcomer: 'Newcomer',
  intermediate: 'Intermediate',
  expert: 'Expert',
}
