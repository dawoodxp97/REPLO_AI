import { cn } from '@replo/ui'
import Link from 'next/link'
import { SETTINGS_SECTIONS, type SettingsSection } from './sections'

export function SettingsNav({ current }: { current: SettingsSection }) {
  return (
    <nav
      aria-label="Settings"
      className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible"
    >
      {SETTINGS_SECTIONS.map((item) => (
        <Link
          key={item.key}
          href={`/settings/${item.key}`}
          aria-current={item.key === current ? 'page' : undefined}
          className={cn(
            'rounded-md px-3 py-1.5 text-sm whitespace-nowrap text-muted-foreground transition-colors outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40',
            item.key === current && 'bg-accent font-medium text-accent-foreground',
          )}
        >
          {item.title}
        </Link>
      ))}
    </nav>
  )
}
