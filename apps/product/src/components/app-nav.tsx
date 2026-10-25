'use client'

import { Button, cn } from '@replo/ui'
import { useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { NotificationBell } from '@/features/notifications/notification-bell'
import { SearchBox } from '@/features/search/search-box'
import { signOut } from '@/lib/auth-client'

const LINKS = [
  { href: '/', label: 'Dashboard' },
  { href: '/library', label: 'Library' },
  { href: '/repositories', label: 'Repositories' },
  { href: '/import', label: 'Import' },
  { href: '/settings/profile', label: 'Settings' },
] as const

export function AppNav({ className }: { className?: string }) {
  const router = useRouter()
  const queryClient = useQueryClient()

  async function endSession() {
    await signOut()
    queryClient.clear()
    router.replace('/login')
  }

  return (
    <header className={cn('border-b border-border bg-background', className)}>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-2 sm:px-6 lg:px-8">
        <Link href="/" className="font-serif text-xl font-semibold tracking-tight">
          Replo
        </Link>
        <div className="flex flex-wrap items-center gap-1 text-sm">
          <nav aria-label="Primary" className="flex flex-wrap items-center gap-1">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <SearchBox />
          <NotificationBell />
          <Button variant="ghost" size="sm" onClick={() => void endSession()}>
            Sign out
          </Button>
        </div>
      </div>
    </header>
  )
}
