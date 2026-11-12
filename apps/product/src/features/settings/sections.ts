import {
  Cpu,
  FolderGit2,
  KeyRound,
  SlidersHorizontal,
  UserRound,
  type LucideIcon,
} from 'lucide-react'

interface SectionInfo {
  key: string
  title: string
  icon: LucideIcon
}

export const SETTINGS_SECTIONS = [
  { key: 'profile', title: 'Profile', icon: UserRound },
  { key: 'preferences', title: 'Preferences', icon: SlidersHorizontal },
  { key: 'github', title: 'GitHub', icon: FolderGit2 },
  { key: 'keys', title: 'API keys', icon: KeyRound },
  { key: 'models', title: 'Models', icon: Cpu },
] as const satisfies readonly SectionInfo[]

export type SettingsSection = (typeof SETTINGS_SECTIONS)[number]['key']

export const settingsPath = (section: SettingsSection) => `/settings/${section}`

export function isSettingsSection(value: string): value is SettingsSection {
  return SETTINGS_SECTIONS.some((section) => section.key === value)
}
