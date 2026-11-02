import type { ComponentType } from 'react'
import { PageHeader } from '@/components/page-header'
import { KeysSection } from '@/features/keys/keys-section'
import { GithubSection } from './github-section'
import { ModelsSection } from './models-section'
import { PreferencesSection } from './preferences-section'
import { ProfileSection } from './profile-section'
import type { SettingsSection } from './sections'
import { SettingsNav } from './settings-nav'

const SECTION_VIEWS: Record<SettingsSection, ComponentType> = {
  profile: ProfileSection,
  preferences: PreferencesSection,
  github: GithubSection,
  keys: KeysSection,
  models: ModelsSection,
}

export function SettingsPage({ section }: { section: SettingsSection }) {
  const View = SECTION_VIEWS[section]

  return (
    <div className="space-y-8">
      <PageHeader title="Settings" description="Your account, reading defaults and AI access." />
      <div className="grid gap-8 md:grid-cols-[11rem_minmax(0,1fr)]">
        <SettingsNav current={section} />
        <div className="min-w-0 max-w-3xl">
          <View />
        </div>
      </div>
    </div>
  )
}
