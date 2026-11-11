'use client'

import { Button, Sheet, SheetContent, SheetTitle } from '@replo/ui'
import { Menu, Search } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRef, useState, type ReactNode } from 'react'
import { Brand } from '@/components/brand'
import { NotificationBell } from '@/features/notifications/notification-bell'
import { SearchBox } from '@/features/search/search-box'
import { breadcrumbsFor } from './breadcrumbs'
import { SidebarNav } from './sidebar-nav'
import { UserMenu } from './user-menu'

export function AppShell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const pathname = usePathname()
  const [searchPath, setSearchPath] = useState<string | null>(null)
  const searchOpen = searchPath === pathname
  const searchButton = useRef<HTMLButtonElement>(null)

  function closeSearch() {
    setSearchPath(null)
    searchButton.current?.focus()
  }
  const crumbs = breadcrumbsFor(pathname)

  return (
    <div className="flex min-h-dvh">
      <a
        href="#workspace-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        <div className="flex h-16 items-center px-5">
          <Brand />
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <p className="mb-4 px-3 text-xs text-muted-foreground">Personal workspace</p>
          <SidebarNav />
        </div>
        <div className="border-t border-sidebar-border p-2">
          <UserMenu />
        </div>
      </aside>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="gap-0 bg-sidebar p-0">
          <div className="flex h-14 items-center px-4">
            <SheetTitle render={<div />}>
              <Brand />
            </SheetTitle>
          </div>
          <div className="flex-1 px-3 py-2">
            <SidebarNav onNavigate={() => setMenuOpen(false)} />
          </div>
          <div className="border-t border-sidebar-border p-2">
            <UserMenu />
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/85 px-4 backdrop-blur-md supports-[backdrop-filter]:bg-background/70 sm:px-6">
          <Button
            variant="ghost"
            size="icon-sm"
            className="md:hidden"
            aria-label="Open navigation"
            onClick={() => setMenuOpen(true)}
          >
            <Menu />
          </Button>
          <Brand className="md:hidden" />
          {crumbs ? (
            <nav aria-label="Breadcrumb" className="hidden md:block">
              <ol className="flex items-center gap-2 text-xs text-muted-foreground">
                {crumbs.map((crumb, index) => (
                  <li key={crumb.label} className="flex items-center gap-2">
                    {index > 0 ? <span aria-hidden="true">/</span> : null}
                    {crumb.href ? (
                      <Link
                        href={crumb.href}
                        className="inline-flex min-h-6 items-center rounded-sm hover:text-foreground"
                      >
                        {crumb.label}
                      </Link>
                    ) : (
                      <span aria-current="page" className="font-medium text-foreground">
                        {crumb.label}
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
          ) : null}
          <div className="ml-auto flex items-center gap-1.5">
            <SearchBox className="hidden sm:block" />
            <Button
              ref={searchButton}
              variant="ghost"
              size="icon"
              className="sm:hidden"
              aria-label="Search your library"
              aria-expanded={searchOpen}
              onClick={() => setSearchPath(pathname)}
            >
              <Search />
            </Button>
            <NotificationBell />
          </div>
          {searchOpen ? (
            <div
              className="absolute inset-0 flex items-center gap-2 bg-background px-4 sm:hidden"
              onKeyDown={(event) => {
                if (event.key === 'Escape') closeSearch()
              }}
            >
              <SearchBox autoFocus className="flex-1" />
              <Button variant="ghost" size="sm" onClick={closeSearch}>
                Cancel
              </Button>
            </div>
          ) : null}
        </header>
        <main
          id="workspace-content"
          tabIndex={-1}
          className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 outline-none sm:px-6 lg:px-10 lg:py-10"
        >
          {children}
        </main>
      </div>
    </div>
  )
}
