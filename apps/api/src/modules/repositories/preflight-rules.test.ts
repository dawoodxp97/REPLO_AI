import { describe, expect, it } from 'vitest'
import { frameworkFromManifest } from './framework-manifest'

const encode = (text: string, encoding: 'base64' | 'utf-8' = 'base64') => ({
  content: encoding === 'base64' ? Buffer.from(text).toString('base64') : text,
  encoding,
})

describe('frameworkFromManifest', () => {
  it('reads a base64 package.json', () => {
    expect(
      frameworkFromManifest(encode(JSON.stringify({ devDependencies: { express: '5' } }))),
    ).toBe('Express')
  })

  it('reads a utf-8 package.json', () => {
    expect(
      frameworkFromManifest(encode(JSON.stringify({ dependencies: { fastify: '5' } }), 'utf-8')),
    ).toBe('Fastify')
  })

  it('is null for malformed JSON or an unexpected shape', () => {
    expect(frameworkFromManifest(encode('{not json'))).toBeNull()
    expect(frameworkFromManifest(encode(JSON.stringify({ dependencies: ['next'] })))).toBeNull()
  })
})
