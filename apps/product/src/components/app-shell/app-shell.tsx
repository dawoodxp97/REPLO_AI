'use client'

import { Button, Sheet, SheetContent, SheetTitle } from '@replo/ui'
import { Menu } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Brand } from '@/components/brand'
import { NotificationBell } from '@/features/notifications/notification-bell'
import { SearchBox } from '@/features/search/search-box'
import { SidebarNav } from './sidebar-nav'
import { UserMenu } from './user-menu'

export function AppShell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        <div className="flex h-14 items-center px-4">
          <Brand />
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-2">
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
          <div className="ml-auto flex items-center gap-1.5">
            <SearchBox />
            <NotificationBell />
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-10">
          {children}
        </main>
      </div>
    </div>
  )
}
