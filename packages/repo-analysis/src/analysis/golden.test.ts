import { describe, expect, it } from 'vitest'
import { createAnalyzer, type Analysis } from './analyzer'
import { loadFixture } from './fixtures.test-helpers'

const analyzerPromise = createAnalyzer()

async function analyze(name: string, options: { deadlineMs?: number } = {}): Promise<Analysis> {
  const analyzer = await analyzerPromise
  const fixture = await loadFixture(name)
  const session = analyzer.start({ ...fixture.options, ...options })
  for (const file of fixture.files) session.addFile(file)
  return session.finish()
}

const entriesOf = (result: Analysis) => result.entryPoints.map((entry) => [entry.path, entry.kind])
const routesOf = (result: Analysis) =>
  result.routes.map((route) => [route.method, route.pattern, route.path])
const importsOf = (result: Analysis) =>
  result.edges.map((edge) => [edge.fromPath, edge.toPath, edge.kind])

describe('golden: next-app-router', () => {
  it('finds the root layout, middleware and root page as entry points', async () => {
    const result = await analyze('next-app-router')
    expect(result.framework).toBe('Next.js')
    expect(entriesOf(result)).toEqual([
      ['app/layout.tsx', 'app_root'],
      ['middleware.ts', 'middleware'],
      ['app/page.tsx', 'page'],
    ])
  })

  it('maps app-router pages and route handlers to URL patterns, dropping route groups', async () => {
    const result = await analyze('next-app-router')
    expect(routesOf(result)).toEqual([
      ['GET', '/about', 'app/(marketing)/about/page.tsx'],
      ['GET', '/api/posts', 'app/api/posts/route.ts'],
      ['POST', '/api/posts', 'app/api/posts/route.ts'],
      ['GET', '/blog/:slug', 'app/blog/[slug]/page.tsx'],
      ['GET', '/', 'app/page.tsx'],
    ])
  })

  it('resolves the @/ alias through tsconfig paths, including the trailing comma and comment', async () => {
    const result = await analyze('next-app-router')
    expect(importsOf(result)).toEqual([
      ['app/api/posts/route.ts', 'lib/posts.ts', 'import'],
      ['app/page.tsx', 'components/Button.tsx', 'import'],
      ['app/page.tsx', 'lib/posts.ts', 'import'],
      ['components/Button.test.tsx', 'components/Button.tsx', 'import'],
      ['components/Button.test.tsx', 'components/Button.tsx', 'test_of'],
    ])
    expect(result.unresolvedImports).toBe(0)
  })
})

describe('golden: next-pages', () => {
  it('treats _app as the application root and keeps API routes apart from pages', async () => {
    const result = await analyze('next-pages')
    expect(entriesOf(result)).toEqual([['pages/_app.tsx', 'app_root']])
    expect(routesOf(result)).toEqual([
      ['ANY', '/api/hello', 'pages/api/hello.ts'],
      ['GET', '/', 'pages/index.tsx'],
      ['GET', '/posts/:id', 'pages/posts/[id].tsx'],
    ])
  })

  it('resolves baseUrl-relative imports', async () => {
    const result = await analyze('next-pages')
    expect(importsOf(result)).toEqual([['pages/index.tsx', 'lib/data.ts', 'import']])
  })
})

describe('golden: react-router-spa', () => {
  it('uses the router factory file as the entry and its path properties as routes', async () => {
    const result = await analyze('react-router-spa')
    expect(result.framework).toBe('React Router')
    expect(entriesOf(result)).toEqual([['src/main.tsx', 'router']])
    expect(routesOf(result)).toEqual([
      ['GET', '/', 'src/main.tsx'],
      ['GET', '/tasks/:taskId', 'src/main.tsx'],
    ])
    expect(importsOf(result)).toEqual([
      ['src/main.tsx', 'src/pages/Home.tsx', 'import'],
      ['src/main.tsx', 'src/pages/TaskPage.tsx', 'import'],
    ])
  })
})

describe('golden: express-api', () => {
  it('prefers the start script over main and listen, mapping dist output back to source', async () => {
    const result = await analyze('express-api')
    expect(result.framework).toBe('Express')
    expect(entriesOf(result)).toEqual([
      ['src/server.ts', 'script'],
      ['src/server.ts', 'main'],
      ['src/server.ts', 'server'],
    ])
  })

  it('records routers by receiver and resolves baseUrl imports across files', async () => {
    const result = await analyze('express-api')
    expect(routesOf(result)).toEqual([
      ['GET', '/users', 'src/routes/users.ts'],
      ['POST', '/users', 'src/routes/users.ts'],
      ['GET', '/health', 'src/server.ts'],
      ['ANY', '/api', 'src/server.ts'],
    ])
    expect(importsOf(result)).toEqual([['src/server.ts', 'src/routes/users.ts', 'import']])
  })
})

describe('golden: fastify-api', () => {
  it('uses the bin target and the listening file as entries', async () => {
    const result = await analyze('fastify-api')
    expect(result.framework).toBe('Fastify')
    expect(entriesOf(result)).toEqual([
      ['src/index.ts', 'bin'],
      ['src/index.ts', 'server'],
    ])
    expect(routesOf(result)).toEqual([['GET', '/ping', 'src/index.ts']])
  })
})

describe('golden: library (no framework)', () => {
  it('uses main as the entry and resolves every import form', async () => {
    const result = await analyze('library')
    expect(result.framework).toBeNull()
    expect(entriesOf(result)).toEqual([['src/index.ts', 'main']])
    expect(importsOf(result)).toEqual([
      ['src/index.test.ts', 'src/index.ts', 'import'],
      ['src/index.test.ts', 'src/index.ts', 'test_of'],
      ['src/index.ts', 'src/lazy.ts', 'import'],
      ['src/index.ts', 'src/legacy.js', 'import'],
      ['src/index.ts', 'src/math/add.ts', 'import'],
      ['src/index.ts', 'src/math/index.ts', 'import'],
      ['src/index.ts', 'src/util.ts', 'import'],
      ['src/legacy.js', 'src/lazy.ts', 'import'],
      ['src/math/index.ts', 'src/math/add.ts', 'import'],
    ])
  })

  it('counts the unresolvable relative import and reports the file with a syntax error', async () => {
    const result = await analyze('library')
    expect(result.unresolvedImports).toBe(1)
    expect(result.parseErrors).toEqual(['src/broken.ts'])
  })

  it('extracts classes, methods, interfaces, enums and exported functions with stable keys', async () => {
    const result = await analyze('library')
    const keys = result.symbols.map((symbol) => `${symbol.symbolKey}:${symbol.kind}`)
    expect(keys).toEqual(
      expect.arrayContaining([
        'src/util.ts#Shape:interface',
        'src/util.ts#Id:type',
        'src/util.ts#Color:enum',
        'src/util.ts#Store:class',
        'src/util.ts#Store.load:method',
        'src/util.ts#Store.save:method',
        'src/math/add.ts#add:function',
        'src/index.ts#sum:function',
      ]),
    )
  })

  it('gives every file a metric row and ranks the imported modules higher', async () => {
    const result = await analyze('library')
    expect(Object.keys(result.metrics).sort()).toEqual(
      [
        'src/broken.ts',
        'src/index.test.ts',
        'src/index.ts',
        'src/lazy.ts',
        'src/legacy.js',
        'src/math/add.ts',
        'src/math/index.ts',
        'src/util.ts',
      ].sort(),
    )
    expect(result.metrics['src/math/add.ts']?.fanIn).toBe(2)
    expect(result.metrics['src/index.test.ts']?.fanOut).toBe(1)
    expect(result.metrics['src/math/add.ts']?.pageRank).toBeGreaterThan(
      result.metrics['src/index.test.ts']?.pageRank ?? 1,
    )
  })

  it('reports a file as unparsed when the parse deadline has passed', async () => {
    const analyzer = await analyzerPromise
    const session = analyzer.start({ deadlineMs: -1 })
    session.addFile({
      path: 'src/huge.ts',
      text: Array.from({ length: 20_000 }, (_, i) => `export const v${i} = ${i} + 1`).join('\n'),
      role: 'source',
      language: 'typescript',
    })
    const result = session.finish()
    expect(result.parseErrors).toEqual(['src/huge.ts'])
    expect(result.symbols).toEqual([])
    expect(result.metrics).toEqual({})
  })
})

describe('golden: redux-spa', () => {
  it('enters through index.html and follows the store, slice and component imports', async () => {
    const result = await analyze('redux-spa')
    expect(entriesOf(result)).toEqual([['src/main.tsx', 'app_root']])
    expect(routesOf(result)).toEqual([])
    expect(importsOf(result)).toEqual([
      ['src/App.tsx', 'src/components/TodoList.tsx', 'import'],
      ['src/app/store.ts', 'src/features/todos/todosSlice.ts', 'import'],
      ['src/components/TodoList.tsx', 'src/app/store.ts', 'import'],
      ['src/components/TodoList.tsx', 'src/features/todos/todosSlice.ts', 'import'],
      ['src/features/todos/todosApi.ts', 'src/features/todos/todosSlice.ts', 'import'],
      ['src/features/todos/todosSlice.test.ts', 'src/features/todos/todosSlice.ts', 'import'],
      ['src/features/todos/todosSlice.test.ts', 'src/features/todos/todosSlice.ts', 'test_of'],
      ['src/main.tsx', 'src/App.tsx', 'import'],
      ['src/main.tsx', 'src/app/store.ts', 'import'],
    ])
  })

  it('does not mistake destructured exports for symbols', async () => {
    const result = await analyze('redux-spa')
    const names = result.symbols.map((symbol) => symbol.symbolKey)
    expect(names).toContain('src/features/todos/todosSlice.ts#todosReducer')
    expect(names.some((key) => key.includes('{'))).toBe(false)
  })
})

describe('golden: monorepo', () => {
  it('resolves workspace packages by name and by subpath, and enters each app and package', async () => {
    const result = await analyze('monorepo')
    expect(entriesOf(result)).toEqual([
      ['apps/web/src/main.ts', 'main'],
      ['packages/core/src/index.ts', 'main'],
    ])
    expect(importsOf(result)).toEqual([
      ['apps/web/src/catalog.ts', 'packages/core/src/index.ts', 'import'],
      ['apps/web/src/catalog.ts', 'packages/core/src/price.ts', 'import'],
      ['apps/web/src/main.ts', 'apps/web/src/catalog.ts', 'import'],
      ['apps/web/src/main.ts', 'packages/core/src/index.ts', 'import'],
      ['packages/core/src/index.ts', 'packages/core/src/price.ts', 'import'],
      ['packages/core/src/index.ts', 'packages/core/src/types.ts', 'import'],
    ])
    expect(result.unresolvedImports).toBe(0)
  })
})

describe('golden: cli-or-library', () => {
  it('enters through the bin target and the package main, with a test edge to its subject', async () => {
    const result = await analyze('cli')
    expect(entriesOf(result)).toEqual([
      ['src/cli.ts', 'bin'],
      ['src/index.ts', 'main'],
    ])
    expect(importsOf(result)).toEqual([
      ['src/cli.ts', 'src/format.ts', 'import'],
      ['src/format.test.ts', 'src/format.ts', 'import'],
      ['src/format.test.ts', 'src/format.ts', 'test_of'],
      ['src/index.ts', 'src/format.ts', 'import'],
    ])
  })
})

describe('golden: legacy-js', () => {
  it('follows CommonJS require chains and treats the external package as out of scope', async () => {
    const result = await analyze('legacy-js')
    expect(entriesOf(result)).toEqual([['index.js', 'main']])
    expect(importsOf(result)).toEqual([
      ['index.js', 'lib/router.js', 'import'],
      ['lib/router.js', 'lib/handlers.js', 'import'],
    ])
    expect(result.unresolvedImports).toBe(0)
  })
})

describe('golden snapshots', () => {
  for (const name of [
    'next-app-router',
    'next-pages',
    'react-router-spa',
    'express-api',
    'fastify-api',
    'library',
    'redux-spa',
    'monorepo',
    'cli',
    'legacy-js',
  ]) {
    it(`${name} index matches the reviewed snapshot`, async () => {
      const result = await analyze(name)
      await expect(`${JSON.stringify(result, null, 2)}\n`).toMatchFileSnapshot(
        `./__snapshots__/${name}.analysis.json`,
      )
    })
  }
})
