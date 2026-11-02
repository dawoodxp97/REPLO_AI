import { FolderGit2, House, LibraryBig, Settings, type LucideIcon } from 'lucide-react'

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  isActive: (pathname: string) => boolean
}

const startsWith = (prefix: string) => (pathname: string) =>
  pathname === prefix || pathname.startsWith(`${prefix}/`)

export const PRIMARY_NAV: readonly NavItem[] = [
  { href: '/', label: 'Home', icon: House, isActive: (pathname) => pathname === '/' },
  { href: '/library', label: 'Library', icon: LibraryBig, isActive: startsWith('/library') },
  {
    href: '/repositories',
    label: 'Repositories',
    icon: FolderGit2,
    isActive: (pathname) => startsWith('/repositories')(pathname) || startsWith('/jobs')(pathname),
  },
  {
    href: '/settings/profile',
    label: 'Settings',
    icon: Settings,
    isActive: startsWith('/settings'),
  },
]
