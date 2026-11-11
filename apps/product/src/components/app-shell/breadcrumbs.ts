import { SETTINGS_SECTIONS } from '@/features/settings/sections'

export interface Crumb {
  label: string
  href?: string
}

export function breadcrumbsFor(pathname: string): Crumb[] | null {
  const [area, child] = pathname.split('/').filter(Boolean)
  if (!child) return null
  if (area === 'settings') {
    const section = SETTINGS_SECTIONS.find((item) => item.key === child)
    return section ? [{ label: 'Settings', href: '/settings/profile' }, { label: section.title }] : null
  }
  if (area === 'jobs') return [{ label: 'Library', href: '/library' }, { label: 'Generation' }]
  return null
}
