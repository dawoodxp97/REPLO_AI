'use client'

import { cn } from '@replo/ui'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LinkButton } from '@/components/link-button'
import { PRIMARY_NAV } from './nav-items'

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()

  return (
    <div className="flex flex-col gap-5">
      <LinkButton href="/import" className="w-full justify-start" onClick={onNavigate}>
        <Plus />
        New tutorial
      </LinkButton>
      <nav aria-label="Primary">
        <ul className="flex flex-col gap-0.5">
          {PRIMARY_NAV.map(({ href, label, icon: Icon, isActive }) => {
            const active = isActive(pathname)
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  onClick={onNavigate}
                  className={cn(
                    'flex h-8 items-center gap-2.5 rounded-md px-2.5 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground',
                    active && 'bg-sidebar-accent font-medium text-foreground',
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                  {label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}
