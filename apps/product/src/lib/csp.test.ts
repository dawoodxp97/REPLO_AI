import { describe, expect, it } from 'vitest'
import { buildContentSecurityPolicy } from './csp'

const production = {
  nonce: 'abc123',
  apiOrigin: 'https://api.replo.dev',
  development: false,
  upgradeInsecureRequests: true,
}

function directive(policy: string, name: string): string[] {
  const found = policy.split('; ').find((entry) => entry.startsWith(`${name} `) || entry === name)
  return found?.split(' ').slice(1) ?? []
}

describe('buildContentSecurityPolicy', () => {
  it('allows scripts and styles only with the request nonce', () => {
    const policy = buildContentSecurityPolicy(production)
    expect(directive(policy, 'script-src')).toEqual([
      "'self'",
      "'nonce-abc123'",
      "'strict-dynamic'",
    ])
    expect(directive(policy, 'style-src')).toEqual(["'self'", "'nonce-abc123'"])
  })

  it('keeps eval and inline styles out of production', () => {
    const policy = buildContentSecurityPolicy(production)
    expect(policy).not.toContain('unsafe-eval')
    expect(policy).not.toContain('unsafe-inline')
  })

  it('relaxes script and style sources only in development', () => {
    const policy = buildContentSecurityPolicy({ ...production, development: true })
    expect(directive(policy, 'script-src')).toContain("'unsafe-eval'")
    expect(directive(policy, 'style-src')).toEqual(["'self'", "'unsafe-inline'"])
  })

  it('connects only to the API origin', () => {
    const policy = buildContentSecurityPolicy(production)
    expect(directive(policy, 'connect-src')).toEqual(["'self'", 'https://api.replo.dev'])
  })

  it('forbids framing, plugins and foreign base URIs', () => {
    const policy = buildContentSecurityPolicy(production)
    expect(directive(policy, 'frame-ancestors')).toEqual(["'none'"])
    expect(directive(policy, 'object-src')).toEqual(["'none'"])
    expect(directive(policy, 'base-uri')).toEqual(["'self'"])
  })

  it('upgrades insecure requests only when the app is served over HTTPS', () => {
    expect(buildContentSecurityPolicy(production)).toContain('upgrade-insecure-requests')
    const local = buildContentSecurityPolicy({ ...production, upgradeInsecureRequests: false })
    expect(local).not.toContain('upgrade-insecure-requests')
  })

  it('is a single header value with no stray whitespace', () => {
    const policy = buildContentSecurityPolicy(production)
    expect(policy).not.toMatch(/\n/)
    expect(policy).not.toMatch(/ {2,}/)
  })
})
