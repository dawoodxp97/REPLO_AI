import { describe, expect, it } from 'vitest'
import {
  classifyRole,
  detectLanguage,
  isBinaryExtension,
  isExcludedPath,
  looksBinary,
} from './filters'

describe('isExcludedPath', () => {
  it.each([
    'node_modules/x/index.js',
    'src/dist/a.js',
    '.git/config',
    'apps/web/.next/server.js',
    'coverage/lcov.info',
  ])('excludes %s', (p) => {
    expect(isExcludedPath(p)).toBe(true)
  })

  it('excludes env files anywhere (may contain secrets)', () => {
    expect(isExcludedPath('.env')).toBe(true)
    expect(isExcludedPath('apps/api/.env.production')).toBe(true)
  })

  it('keeps normal source and .env.example-like names out only when they are env files', () => {
    expect(isExcludedPath('src/index.ts')).toBe(false)
    expect(isExcludedPath('src/environment.ts')).toBe(false)
  })
})

describe('language and role', () => {
  it('detects TS/JS', () => {
    expect(detectLanguage('a/b.tsx')).toBe('typescript')
    expect(detectLanguage('a/b.mjs')).toBe('javascript')
    expect(detectLanguage('README.md')).toBe('markdown')
  })

  it('classifies roles', () => {
    expect(classifyRole('src/a.ts')).toBe('source')
    expect(classifyRole('src/a.test.ts')).toBe('test')
    expect(classifyRole('__tests__/a.ts')).toBe('test')
    expect(classifyRole('next.config.mjs')).toBe('config')
    expect(classifyRole('dist/a.min.js')).toBe('generated')
    expect(classifyRole('logo.png')).toBe('asset')
    expect(classifyRole('docs/guide.md')).toBe('doc')
  })
})

describe('binary detection', () => {
  it('flags known extensions', () => {
    expect(isBinaryExtension('x.PNG')).toBe(true)
    expect(isBinaryExtension('x.ts')).toBe(false)
  })

  it('sniffs NUL bytes', () => {
    expect(looksBinary(new Uint8Array([104, 105, 0, 1]))).toBe(true)
    expect(looksBinary(new TextEncoder().encode('console.log(1)'))).toBe(false)
  })
})
