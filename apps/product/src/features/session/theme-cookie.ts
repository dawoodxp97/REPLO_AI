import { Theme } from '@replo/contracts'

export const THEME_COOKIE = 'replo-theme'

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365

export type PinnedTheme = Exclude<Theme, 'system'>

export function parseThemeCookie(value: string | undefined): PinnedTheme | undefined {
  const parsed = Theme.safeParse(value)
  return parsed.success && parsed.data !== 'system' ? parsed.data : undefined
}

export function themeCookie(theme: Theme, secure: boolean): string {
  const pinned = theme === 'system' ? '' : theme
  const maxAge = theme === 'system' ? 0 : ONE_YEAR_SECONDS
  return `${THEME_COOKIE}=${pinned}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure ? '; Secure' : ''}`
}
