import { createRequire } from 'node:module'
import { Language, Parser, type Node } from 'web-tree-sitter'

export type Grammar = 'typescript' | 'tsx' | 'javascript'

const GRAMMAR_FILES: Record<Grammar, string> = {
  typescript: 'tree-sitter-typescript.wasm',
  tsx: 'tree-sitter-tsx.wasm',
  javascript: 'tree-sitter-javascript.wasm',
}

const requireFromHere = createRequire(import.meta.url)

const GRAMMAR_BY_EXTENSION: Record<string, Grammar> = {
  ts: 'typescript',
  mts: 'typescript',
  cts: 'typescript',
  tsx: 'tsx',
  js: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
}

export const grammarFor = (path: string): Grammar | undefined => {
  const extension = path.slice(path.lastIndexOf('.') + 1).toLowerCase()
  return path.includes('.') ? GRAMMAR_BY_EXTENSION[extension] : undefined
}

export interface SourceParser {
  withTree<T>(
    text: string,
    grammar: Grammar,
    deadlineEpochMs: number,
    use: (root: Node) => T,
  ): T | undefined
}

export async function createSourceParser(): Promise<SourceParser> {
  await Parser.init()
  const parser = new Parser()
  const languages = new Map<Grammar, Language>()
  for (const grammar of Object.keys(GRAMMAR_FILES) as Grammar[]) {
    const path = requireFromHere.resolve(`@vscode/tree-sitter-wasm/wasm/${GRAMMAR_FILES[grammar]}`)
    languages.set(grammar, await Language.load(path))
  }

  return {
    withTree(text, grammar, deadlineEpochMs, use) {
      const language = languages.get(grammar)
      if (!language) throw new Error(`grammar not loaded: ${grammar}`)
      parser.setLanguage(language)
      const tree = parser.parse(text, null, {
        progressCallback: () => Date.now() > deadlineEpochMs,
      })
      if (!tree) return undefined
      try {
        return use(tree.rootNode)
      } finally {
        tree.delete()
      }
    },
  }
}
