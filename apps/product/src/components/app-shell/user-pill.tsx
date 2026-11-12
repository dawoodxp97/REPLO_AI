'use client'

import { Theme } from '@replo/contracts'
import {
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Separator,
  ToggleGroup,
  ToggleGroupItem,
} from '@replo/ui'
import { ChevronDown, LogOut, Monitor, Moon, Sun, type LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { UserAvatar } from '@/components/user-avatar'
import { useThemePreference } from '@/features/session/use-theme-preference'
import { useWorkspaceSetup, type WorkspaceSetup } from '@/features/session/use-workspace-setup'
import { THEME_LABELS } from '@/features/settings/preference-labels'
import { SETTINGS_SECTIONS, settingsPath, type SettingsSection } from '@/features/settings/sections'
import { capitalize, formatCount } from '@/lib/format'
import { useSignOut } from './use-sign-out'

const THEME_ICONS: Record<Theme, LucideIcon> = { system: Monitor, light: Sun, dark: Moon }

function sectionStatus(section: SettingsSection, setup: WorkspaceSetup): string | undefined {
  switch (section) {
    case 'keys':
      if (!setup.keys) return undefined
      return setup.keys.length === 0 ? 'None saved' : `${formatCount(setup.keys.length)} saved`
    case 'github':
      if (setup.githubLinked === undefined) return undefined
      return setup.githubLinked ? 'Connected' : 'Not connected'
    case 'models':
      return setup.preset ? capitalize(setup.preset) : undefined
    default:
      return undefined
  }
}

function ThemeSwitch() {
  const { theme, setTheme } = useThemePreference()

  return (
    <div className="space-y-1.5 p-3">
      <p id="account-theme" className="text-xs text-muted-foreground">
        Theme
      </p>
      <ToggleGroup
        aria-labelledby="account-theme"
        value={[theme ?? 'system']}
        onValueChange={([next]) => {
          const picked = Theme.safeParse(next)
          if (picked.success) setTheme(picked.data)
        }}
      >
        {Theme.options.map((value) => {
          const Icon = THEME_ICONS[value]
          return (
            <ToggleGroupItem key={value} value={value}>
              <Icon aria-hidden />
              {THEME_LABELS[value]}
            </ToggleGroupItem>
          )
        })}
      </ToggleGroup>
    </div>
  )
}

function AccountLinks({ setup, onNavigate }: { setup: WorkspaceSetup; onNavigate: () => void }) {
  return (
    <nav aria-label="Account">
      <ul className="p-1.5">
        {SETTINGS_SECTIONS.map(({ key, title, icon: Icon }) => (
          <li key={key}>
            <Link
              href={settingsPath(key)}
              onClick={onNavigate}
              className="flex h-9 items-center gap-2.5 rounded-md px-2.5 text-sm transition-colors hover:bg-accent focus-visible:-outline-offset-2 pointer-coarse:h-10"
            >
              <Icon className="size-4 text-muted-foreground" aria-hidden />
              <span className="flex-1">{title}</span>
              <span className="text-xs text-muted-foreground">{sectionStatus(key, setup)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export function UserPill() {
  const [open, setOpen] = useState(false)
  const setup = useWorkspaceSetup()
  const { signOut, isPending } = useSignOut()
  const { user } = setup
  const displayName = user?.name || user?.email || 'Your account'

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={`Account: ${displayName}`}
        className="flex h-9 max-w-52 cursor-pointer items-center gap-2 rounded-full border bg-card py-1 pr-2 pl-1 text-sm shadow-xs transition-colors hover:bg-accent data-[popup-open]:bg-accent pointer-coarse:h-10"
      >
        <UserAvatar user={user} className="size-7" />
        <span className="hidden truncate font-medium lg:block">{displayName}</span>
        <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-[min(19rem,calc(100vw-2rem))] p-0">
        <div className="flex items-center gap-3 p-4">
          <UserAvatar user={user} className="size-10 text-sm" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{displayName}</p>
            {user?.email && user.name ? (
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            ) : null}
          </div>
        </div>
        <Separator />
        <ThemeSwitch />
        <Separator />
        <AccountLinks setup={setup} onNavigate={() => setOpen(false)} />
        <Separator />
        <div className="p-1.5">
          <Button
            variant="ghost"
            className="w-full justify-start px-2.5 font-normal"
            disabled={isPending}
            onClick={() => void signOut()}
          >
            <LogOut className="text-muted-foreground" />
            Sign out
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
