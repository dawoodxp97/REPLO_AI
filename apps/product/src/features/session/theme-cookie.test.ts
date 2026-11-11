import { describe, expect, it } from 'vitest'
import { parseThemeCookie, themeCookie } from './theme-cookie'

describe('parseThemeCookie', () => {
  it('returns a pinned theme', () => {
    expect(parseThemeCookie('dark')).toBe('dark')
    expect(parseThemeCookie('light')).toBe('light')
  })

  it('ignores system, missing and unknown values', () => {
    expect(parseThemeCookie('system')).toBeUndefined()
    expect(parseThemeCookie(undefined)).toBeUndefined()
    expect(parseThemeCookie('dark;injected')).toBeUndefined()
    expect(parseThemeCookie('')).toBeUndefined()
  })
})

describe('themeCookie', () => {
  it('remembers a pinned theme for a year', () => {
    expect(themeCookie('dark', false)).toBe(
      'replo-theme=dark; Path=/; Max-Age=31536000; SameSite=Lax',
    )
  })

  it('clears the cookie when the theme follows the system', () => {
    expect(themeCookie('system', false)).toBe('replo-theme=; Path=/; Max-Age=0; SameSite=Lax')
  })

  it('marks the cookie secure on https', () => {
    expect(themeCookie('light', true)).toMatch(/; Secure$/)
  })
})
