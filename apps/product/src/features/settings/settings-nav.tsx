import { cn } from '@replo/ui'
import Link from 'next/link'
import { SETTINGS_SECTIONS, settingsPath, type SettingsSection } from './sections'

export function SettingsNav({ current }: { current: SettingsSection }) {
  return (
    <nav
      aria-label="Settings"
      className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible"
    >
      {SETTINGS_SECTIONS.map((item) => (
        <Link
          key={item.key}
          href={settingsPath(item.key)}
          aria-current={item.key === current ? 'page' : undefined}
          className={cn(
            'flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm whitespace-nowrap pointer-coarse:py-2.5 text-muted-foreground transition-colors outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40',
            item.key === current && 'bg-accent font-medium text-accent-foreground',
          )}
        >
          <item.icon className="size-4 shrink-0" aria-hidden />
          {item.title}
        </Link>
      ))}
    </nav>
  )
}
