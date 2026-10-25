import Link from 'next/link'
import { cn } from '@replo/ui'
import { PageHeader } from '@/components/page-header'
import { GithubSection } from './github-section'
import { KeysSection } from '@/features/keys/keys-section'
import { ModelsSection } from './models-section'
import { PreferencesSection } from './preferences-section'
import { ProfileSection } from './profile-section'
import { SETTINGS_SECTIONS, type SettingsSection } from './sections'

export function SettingsPage({ section }: { section: SettingsSection }) {
  return (
    <div className="space-y-8">
      <PageHeader title="Settings" />
      <div className="grid gap-8 md:grid-cols-[12rem_minmax(0,1fr)]">
        <nav aria-label="Settings" className="flex flex-wrap gap-1 md:flex-col">
          {SETTINGS_SECTIONS.map((item) => (
            <Link
              key={item.key}
              href={`/settings/${item.key}`}
              aria-current={item.key === section ? 'page' : undefined}
              className={cn(
                'rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
                item.key === section && 'bg-accent text-accent-foreground',
              )}
            >
              {item.title}
            </Link>
          ))}
        </nav>
        <div className="min-w-0">
          <SectionContent section={section} />
        </div>
      </div>
    </div>
  )
}

function SectionContent({ section }: { section: SettingsSection }) {
  switch (section) {
    case 'profile':
      return <ProfileSection />
    case 'preferences':
      return <PreferencesSection />
    case 'github':
      return <GithubSection />
    case 'keys':
      return <KeysSection />
    case 'models':
      return <ModelsSection />
  }
}
