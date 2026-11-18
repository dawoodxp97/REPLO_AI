import { describe, expect, it } from 'vitest'
import { parseAdminEmails } from './admin-seed'

describe('parseAdminEmails', () => {
  it('returns an empty list for an unset or blank value', () => {
    expect(parseAdminEmails(undefined)).toEqual([])
    expect(parseAdminEmails('')).toEqual([])
    expect(parseAdminEmails('   ')).toEqual([])
  })

  it('splits on commas, trims and lowercases', () => {
    expect(parseAdminEmails(' Ada@Example.com, grace@example.com ')).toEqual([
      'ada@example.com',
      'grace@example.com',
    ])
  })

  it('drops empty segments', () => {
    expect(parseAdminEmails('ada@example.com,,  ,grace@example.com')).toEqual([
      'ada@example.com',
      'grace@example.com',
    ])
  })
})