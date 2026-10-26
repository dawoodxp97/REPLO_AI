import { describe, expect, it } from 'vitest'
import { SignInInput, SignUpInput } from './index'

describe('SignUpInput', () => {
  it('trims and lowercases the email and trims the name', () => {
    const parsed = SignUpInput.parse({
      name: '  Ada Lovelace ',
      email: '  Ada@Example.COM ',
      password: 'correct horse',
    })
    expect(parsed).toEqual({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      password: 'correct horse',
    })
  })

  it('requires a password of at least eight characters', () => {
    const result = SignUpInput.safeParse({
      name: 'Ada',
      email: 'ada@example.com',
      password: 'short',
    })
    expect(result.success).toBe(false)
  })

  it('rejects an email that is not an address', () => {
    const result = SignUpInput.safeParse({
      name: 'Ada',
      email: 'not-an-email',
      password: 'correct horse',
    })
    expect(result.success).toBe(false)
  })
})

describe('SignInInput', () => {
  it('normalizes the email and accepts any non-empty password up to the limit', () => {
    expect(SignInInput.parse({ email: 'Ada@Example.com', password: 'x' })).toEqual({
      email: 'ada@example.com',
      password: 'x',
    })
    expect(SignInInput.safeParse({ email: 'ada@example.com', password: '' }).success).toBe(false)
    expect(
      SignInInput.safeParse({ email: 'ada@example.com', password: 'x'.repeat(129) }).success,
    ).toBe(false)
  })
})
