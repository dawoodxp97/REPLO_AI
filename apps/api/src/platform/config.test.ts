import { randomBytes } from 'node:crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadConfig } from './config'

const base = () => ({
  NODE_ENV: 'development',
  DATABASE_URL: 'postgres://app:app@localhost:5432/replo',
  API_PUBLIC_URL: 'http://localhost:7200',
  PRODUCT_ORIGIN: 'http://localhost:7101',
  KEY_ENCRYPTION_KEY: randomBytes(32).toString('base64'),
})

function expectRejected(source: NodeJS.ProcessEnv): string {
  const errors: string[] = []
  vi.spyOn(console, 'error').mockImplementation((message: string) => {
    errors.push(message)
  })
  vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
    throw new Error(`exit ${code}`)
  }) as never)
  expect(() => loadConfig(source)).toThrow('exit 1')
  return errors.join('\n')
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('loadConfig oauth credential pairs', () => {
  it('accepts both or neither', () => {
    expect(() => loadConfig(base())).not.toThrow()
    expect(() =>
      loadConfig({ ...base(), GOOGLE_CLIENT_ID: 'id', GOOGLE_CLIENT_SECRET: 'secret' }),
    ).not.toThrow()
  })

  it('treats empty strings as unset', () => {
    expect(() =>
      loadConfig({ ...base(), GOOGLE_CLIENT_ID: '', GOOGLE_CLIENT_SECRET: '' }),
    ).not.toThrow()
  })

  it('fails when only the Google client id is set', () => {
    expect(expectRejected({ ...base(), GOOGLE_CLIENT_ID: 'id' })).toContain(
      'GOOGLE_CLIENT_SECRET is required when GOOGLE_CLIENT_ID is set',
    )
  })

  it('fails when only the Google secret is set', () => {
    expect(expectRejected({ ...base(), GOOGLE_CLIENT_SECRET: 'secret' })).toContain(
      'GOOGLE_CLIENT_ID is required when GOOGLE_CLIENT_SECRET is set',
    )
  })

  it('fails when only the GitHub App client secret is set', () => {
    expect(expectRejected({ ...base(), GITHUB_APP_CLIENT_SECRET: 'secret' })).toContain(
      'GITHUB_APP_CLIENT_ID is required when GITHUB_APP_CLIENT_SECRET is set',
    )
  })
})

describe('loadConfig TRUST_PROXY', () => {
  it('defaults to no trusted proxy in development and one hop in production', () => {
    expect(loadConfig(base()).TRUST_PROXY).toBe(false)
    const production = {
      ...base(),
      NODE_ENV: 'production',
      GITHUB_APP_ID: '1',
      GITHUB_APP_PRIVATE_KEY: 'key',
      GITHUB_APP_CLIENT_ID: 'id',
      GITHUB_APP_CLIENT_SECRET: 'secret',
      GITHUB_WEBHOOK_SECRET: 'hook',
    }
    expect(loadConfig(production).TRUST_PROXY).toBe(1)
    expect(loadConfig({ ...production, TRUST_PROXY: 'false' }).TRUST_PROXY).toBe(false)
  })

  it('reads hop counts and CIDR lists', () => {
    expect(loadConfig({ ...base(), TRUST_PROXY: '2' }).TRUST_PROXY).toBe(2)
    expect(loadConfig({ ...base(), TRUST_PROXY: '10.0.0.0/8,172.16.0.0/12' }).TRUST_PROXY).toEqual([
      '10.0.0.0/8',
      '172.16.0.0/12',
    ])
  })

  it('refuses to trust every hop', () => {
    expect(expectRejected({ ...base(), TRUST_PROXY: 'true' })).toContain('TRUST_PROXY')
  })
})
