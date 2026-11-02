import { createRequire } from 'node:module'
import { Language as TreeSitterLanguage, Parser, type Node } from 'web-tree-sitter'
import { detectLanguage, type Language } from '../filters'

export type Grammar = 'typescript' | 'tsx' | 'javascript'

const GRAMMAR_FILES: Record<Grammar, string> = {
  typescript: 'tree-sitter-typescript.wasm',
  tsx: 'tree-sitter-tsx.wasm',
  javascript: 'tree-sitter-javascript.wasm',
}

const requireFromHere = createRequire(import.meta.url)

const GRAMMAR_BY_LANGUAGE: Partial<Record<Language, Grammar>> = {
  typescript: 'typescript',
  javascript: 'javascript',
}

export const grammarFor = (path: string): Grammar | undefined => {
  if (path.toLowerCase().endsWith('.tsx')) return 'tsx'
  return GRAMMAR_BY_LANGUAGE[detectLanguage(path)]
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
  const languages = new Map<Grammar, TreeSitterLanguage>()
  for (const grammar of Object.keys(GRAMMAR_FILES) as Grammar[]) {
    const path = requireFromHere.resolve(`@vscode/tree-sitter-wasm/wasm/${GRAMMAR_FILES[grammar]}`)
    languages.set(grammar, await TreeSitterLanguage.load(path))
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
