import { Writable } from 'node:stream'
import { describe, expect, it } from 'vitest'
import { createLogger, redactSecrets } from './logger'

function capture() {
  const lines: string[] = []
  const stream = new Writable({
    write(chunk, _enc, cb) {
      lines.push(String(chunk))
      cb()
    },
  })
  return { lines, stream }
}

const FAKE_KEYS = [
  'sk-or-v1-abcdefghijklmnopqrstuvwxyz012345',
  'sk-ant-api03-abcdefghijklmnopqrstuvwxyz',
  'sk-proj-abcdefghijklmnopqrstuvwxyz0123',
  'AIzaSyA-abcdefghijklmnopqrstuvwxyz012345',
  'ghs_abcdefghijklmnopqrstuvwxyz0123456789',
]

describe('log redaction (a key-shaped string must never reach logs)', () => {
  it.each(FAKE_KEYS)('redacts %s in messages', (key) => {
    expect(redactSecrets(`calling provider with ${key} now`)).not.toContain(key)
  })

  it.each(FAKE_KEYS)('redacts %s in the message of a real log line', (key) => {
    const { lines, stream } = capture()
    createLogger({ level: 'info' }, stream).info(`using ${key}`)
    expect(lines.join('')).not.toContain(key)
  })

  it.each(FAKE_KEYS)('redacts %s inside structured fields', (key) => {
    const { lines, stream } = capture()
    createLogger({ level: 'info' }, stream).info({ detail: `key=${key}` }, 'job started')
    expect(lines.join('')).not.toContain(key)
  })

  it('censors well-known secret field names', () => {
    const { lines, stream } = capture()
    createLogger({ level: 'info' }, stream).info(
      { apiKey: 'plain-text-secret-value', user: { token: 'abc' } },
      'x',
    )
    const out = lines.join('')
    expect(out).not.toContain('plain-text-secret-value')
    expect(out).not.toContain('"abc"')
  })

  it('leaves ordinary text alone', () => {
    expect(redactSecrets('generation stage_completed lessons')).toBe(
      'generation stage_completed lessons',
    )
  })
})
