export const SETTINGS_SECTIONS = [
  { key: 'profile', title: 'Profile' },
  { key: 'preferences', title: 'Preferences' },
  { key: 'github', title: 'GitHub' },
  { key: 'keys', title: 'API keys' },
  { key: 'models', title: 'Models' },
] as const

export type SettingsSection = (typeof SETTINGS_SECTIONS)[number]['key']

export function isSettingsSection(value: string): value is SettingsSection {
  return SETTINGS_SECTIONS.some((section) => section.key === value)
}
