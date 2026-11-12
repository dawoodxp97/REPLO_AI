'use client'

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Button,
} from '@replo/ui'
import { Menu, Search } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Fragment, useRef, useState } from 'react'
import { Brand } from '@/components/brand'
import { NotificationBell } from '@/features/notifications/notification-bell'
import { SearchBox } from '@/features/search/search-box'
import { breadcrumbsFor, type Crumb } from './breadcrumbs'
import { UserPill } from './user-pill'

function Crumbs({ crumbs }: { crumbs: readonly Crumb[] }) {
  return (
    <Breadcrumb className="hidden md:block">
      <BreadcrumbList className="text-xs">
        {crumbs.map((crumb, index) => (
          <Fragment key={crumb.label}>
            {index > 0 ? <BreadcrumbSeparator /> : null}
            <BreadcrumbItem>
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className="inline-flex min-h-6 items-center rounded-sm hover:text-foreground"
                >
                  {crumb.label}
                </Link>
              ) : (
                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}

export function AppHeader({ onOpenNavigation }: { onOpenNavigation: () => void }) {
  const pathname = usePathname()
  const crumbs = breadcrumbsFor(pathname)
  // Storing the path the phone search was opened on closes it on navigation without an effect.
  const [searchPath, setSearchPath] = useState<string | null>(null)
  const searchOpen = searchPath === pathname
  const searchButton = useRef<HTMLButtonElement>(null)

  function closeSearch() {
    setSearchPath(null)
    searchButton.current?.focus()
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/85 px-4 backdrop-blur-md supports-[backdrop-filter]:bg-background/70 sm:px-6">
      <Button
        variant="ghost"
        size="icon-sm"
        className="md:hidden"
        aria-label="Open navigation"
        onClick={onOpenNavigation}
      >
        <Menu />
      </Button>
      <Brand className="md:hidden" />
      {crumbs ? <Crumbs crumbs={crumbs} /> : null}
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
        <UserPill />
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
  )
}
