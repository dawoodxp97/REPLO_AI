import { createHash } from 'node:crypto'
import { SourceIndex, type SnapshotIndexData } from '../modules/pipeline/grounding/source-index'

export const FIXTURE_FILES: Record<string, string> = {
  'src/cart.ts': [
    'export function addToCart(item: string) {',
    '  const items = loadCart()',
    '  items.push(item)',
    '  return saveCart(items)',
    '}',
    '',
    'export function loadCart() {',
    '  return []',
    '}',
  ].join('\n'),
  'src/api/routes.ts': [
    "import { addToCart } from '../cart'",
    '',
    'export function postCart(body: string) {',
    '  return addToCart(body)',
    '}',
  ].join('\n'),
}

const sha1Of = (text: string) => createHash('sha1').update(text).digest('hex')

export function fixtureData(): SnapshotIndexData {
  return {
    files: Object.entries(FIXTURE_FILES).map(([path, text]) => ({
      path,
      blobSha: sha1Of(text),
      language: 'typescript',
      role: 'source',
      sizeBytes: text.length,
    })),
    symbols: [
      {
        symbolKey: 'src/cart.ts#addToCart',
        name: 'addToCart',
        kind: 'function',
        path: 'src/cart.ts',
        startLine: 1,
        endLine: 5,
        exported: true,
        signature: null,
      },
      {
        symbolKey: 'src/cart.ts#loadCart',
        name: 'loadCart',
        kind: 'function',
        path: 'src/cart.ts',
        startLine: 7,
        endLine: 9,
        exported: true,
        signature: null,
      },
      {
        symbolKey: 'src/api/routes.ts#postCart',
        name: 'postCart',
        kind: 'function',
        path: 'src/api/routes.ts',
        startLine: 3,
        endLine: 5,
        exported: true,
        signature: null,
      },
    ],
    edges: [{ fromPath: 'src/api/routes.ts', toPath: 'src/cart.ts', kind: 'import' }],
    dependencies: ['zod'],
  }
}

export function fixtureIndex(): SourceIndex {
  return new SourceIndex(fixtureData(), async (path) => FIXTURE_FILES[path])
}

export const blobOf = (path: string) => sha1Of(FIXTURE_FILES[path] ?? '')
