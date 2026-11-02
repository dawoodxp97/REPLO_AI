'use client'

import type { Theme } from '@replo/contracts'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@replo/ui'
import { useQuery } from '@tanstack/react-query'
import { ChevronsUpDown, LogOut, Monitor, Moon, Settings, Sun } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useThemePreference } from '@/features/session/use-theme-preference'
import { orpc } from '@/lib/orpc'
import { useSignOut } from './use-sign-out'

const THEMES = [
  { value: 'system', label: 'System', icon: Monitor },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
] as const satisfies readonly { value: Theme; label: string; icon: unknown }[]

function initialsOf(name: string | null, email: string | null): string {
  const source = name?.trim() || email?.trim() || '?'
  const words = source.split(/[\s@._-]+/).filter(Boolean)
  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
}

export function UserMenu() {
  const router = useRouter()
  const me = useQuery(orpc.me.get.queryOptions())
  const { theme, setTheme } = useThemePreference()
  const { signOut } = useSignOut()
  const user = me.data?.user
  const displayName = user?.name || user?.email || 'Your account'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account menu"
        className="flex w-full items-center gap-2.5 rounded-md p-1.5 text-left text-sm transition-colors outline-none hover:bg-sidebar-accent focus-visible:ring-[3px] focus-visible:ring-ring/40 data-[popup-open]:bg-sidebar-accent"
      >
        <Avatar className="size-7 rounded-md">
          {user?.image ? <AvatarImage src={user.image} alt="" /> : null}
          <AvatarFallback className="rounded-md">
            {initialsOf(user?.name ?? null, user?.email ?? null)}
          </AvatarFallback>
        </Avatar>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{displayName}</span>
          {user?.email && user.name ? (
            <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
          ) : null}
        </span>
        <ChevronsUpDown className="size-4 text-muted-foreground" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Theme</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={theme ?? 'system'}
            onValueChange={(value: Theme) => setTheme(value)}
          >
            {THEMES.map(({ value, label, icon: Icon }) => (
              <DropdownMenuRadioItem key={value} value={value}>
                <Icon />
                {label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push('/settings/profile')}>
          <Settings />
          Settings
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => void signOut()}>
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
