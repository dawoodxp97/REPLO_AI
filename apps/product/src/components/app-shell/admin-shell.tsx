'use client'

import { cn } from '@replo/ui'
import { Activity, LayoutDashboard, Server, Users } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { Brand } from '@/components/brand'
import { LinkButton } from '@/components/link-button'

const SECTIONS = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/jobs', label: 'Jobs', icon: Activity },
  { href: '/admin/system', label: 'System', icon: Server },
] as const

function isActive(pathname: string, href: string): boolean {
  return href === '/admin' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#admin-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur-md supports-[backdrop-filter]:bg-background/70 sm:px-6">
        <Brand href="/admin" />
        <span aria-hidden className="text-muted-foreground">
          /
        </span>
        <span className="text-sm text-muted-foreground">Admin</span>
        <nav aria-label="Admin" className="ml-4 hidden items-center gap-0.5 md:flex">
          {SECTIONS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(pathname, href) ? 'page' : undefined}
              className={cn(
                'inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm text-muted-foreground transition-colors outline-none hover:bg-accent hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40',
                isActive(pathname, href) && 'bg-accent font-medium text-foreground',
              )}
            >
              <Icon className="size-4" aria-hidden />
              {label}
            </Link>
          ))}
        </nav>
        <LinkButton href="/" variant="ghost" size="sm" className="ml-auto">
          Back to app
        </LinkButton>
      </header>
      <nav
        aria-label="Admin"
        className="flex gap-1 overflow-x-auto border-b px-4 py-2 md:hidden"
      >
        {SECTIONS.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            aria-current={isActive(pathname, href) ? 'page' : undefined}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm whitespace-nowrap pointer-coarse:py-2.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
              isActive(pathname, href) && 'bg-accent font-medium text-foreground',
            )}
          >
            {label}
          </Link>
        ))}
      </nav>
      <main
        id="admin-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-6xl flex-1 space-y-8 px-4 py-8 outline-none sm:px-6 lg:px-10 lg:py-10"
      >
        {children}
      </main>
    </div>
  )
}