import { describe, expect, it } from 'vitest'
import { detectFramework, inventory, type TreeEntry } from './inventory'

const blob = (path: string, size = 100): TreeEntry => ({ path, type: 'blob', size })

describe('inventory', () => {
  it('counts source files, languages and bytes over included blobs', () => {
    const summary = inventory([
      blob('src/cart.ts', 300),
      blob('src/view.tsx', 200),
      blob('README.md', 50),
      blob('src/cart.test.ts', 120),
    ])
    expect(summary).toEqual({
      fileCount: 4,
      sourceFileCount: 2,
      indexableFileCount: 4,
      totalBytes: 670,
      languages: { typescript: 3, markdown: 1 },
    })
  })

  it('skips excluded directories, env files and trees', () => {
    const summary = inventory([
      blob('node_modules/left-pad/index.js'),
      blob('dist/bundle.js'),
      blob('.env.local'),
      { path: 'src', type: 'tree' },
      blob('src/index.ts', 10),
    ])
    expect(summary.fileCount).toBe(1)
    expect(summary.totalBytes).toBe(10)
  })

  it('counts binary assets as files but not as bytes', () => {
    const summary = inventory([blob('public/logo.png', 90_000), blob('src/a.ts', 5)])
    expect(summary.fileCount).toBe(2)
    expect(summary.totalBytes).toBe(5)
    expect(summary.languages).toEqual({ other: 1, typescript: 1 })
  })

  it('treats a missing size as zero bytes', () => {
    expect(inventory([{ path: 'src/a.ts', type: 'blob' }]).totalBytes).toBe(0)
  })
})

describe('detectFramework', () => {
  it('detects Next.js from dependencies', () => {
    expect(detectFramework({ dependencies: { next: '16.0.0', react: '19.0.0' } })).toBe('Next.js')
  })

  it('reads devDependencies too', () => {
    expect(detectFramework({ devDependencies: { fastify: '5.0.0' } })).toBe('Fastify')
  })

  it('maps both React Router packages to one label', () => {
    expect(detectFramework({ dependencies: { '@react-router/dev': '7.0.0' } })).toBe('React Router')
  })

  it('returns null when no known framework is declared', () => {
    expect(detectFramework({ dependencies: { lodash: '4.0.0' } })).toBeNull()
    expect(detectFramework({})).toBeNull()
  })
})
