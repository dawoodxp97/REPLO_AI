import type { Node } from 'web-tree-sitter'

export type SymbolKind =
  | 'function'
  | 'component'
  | 'hook'
  | 'class'
  | 'method'
  | 'interface'
  | 'type'
  | 'enum'
  | 'variable'

export interface SymbolDraft {
  qualifiedName: string
  name: string
  kind: SymbolKind
  startLine: number
  endLine: number
  exported: boolean
  signature: string
}

interface CallFact {
  callee: string
  receiver: string | null
  method: string | null
  firstString: string | null
  line: number
}

interface PathProperty {
  value: string
  line: number
}

export interface FileFacts {
  symbols: SymbolDraft[]
  imports: { specifier: string; line: number }[]
  calls: CallFact[]
  pathProperties: PathProperty[]
  constructors: { name: string; callee: string }[]
  exportedFunctions: string[]
  hasErrors: boolean
}

const MAX_SIGNATURE = 160
const HOOK = /^use[A-Z0-9]?/
const PASCAL = /^[A-Z]/
const DECLARATION_KINDS = new Map<string, SymbolKind>([
  ['interface_declaration', 'interface'],
  ['type_alias_declaration', 'type'],
  ['enum_declaration', 'enum'],
])

const lineOf = (node: Node) => node.startPosition.row + 1
const endLineOf = (node: Node) => node.endPosition.row + 1
const fieldText = (node: Node, field: string) => node.childForFieldName(field)?.text ?? null

const stringValue = (node: Node | null | undefined): string | null => {
  if (!node || node.type !== 'string') return null
  return node.text.slice(1, -1)
}

const signatureOf = (node: Node) => node.text.split('\n')[0]?.trim().slice(0, MAX_SIGNATURE) ?? ''

export function extractFacts(root: Node, path: string): FileFacts {
  const isJsx = /\.(tsx|jsx)$/.test(path)
  const facts: FileFacts = {
    symbols: [],
    imports: [],
    calls: [],
    pathProperties: [],
    constructors: [],
    exportedFunctions: [],
    hasErrors: root.hasError,
  }

  const functionKind = (name: string): SymbolKind => {
    if (HOOK.test(name)) return 'hook'
    if (isJsx && PASCAL.test(name)) return 'component'
    return 'function'
  }

  const addSymbol = (
    node: Node,
    name: string,
    kind: SymbolKind,
    exported: boolean,
    prefix?: string,
  ) => {
    const qualifiedName = prefix ? `${prefix}.${name}` : name
    facts.symbols.push({
      qualifiedName,
      name,
      kind,
      startLine: lineOf(node),
      endLine: endLineOf(node),
      exported,
      signature: signatureOf(node),
    })
    if (exported && kind === 'function' && /^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)$/.test(name))
      facts.exportedFunctions.push(name)
    if (exported && kind === 'component' && name === 'default') facts.exportedFunctions.push(name)
  }

  const visitDeclaration = (node: Node, exported: boolean) => {
    const declarationKind = DECLARATION_KINDS.get(node.type)
    if (declarationKind) {
      const name = fieldText(node, 'name')
      if (name) addSymbol(node, name, declarationKind, exported)
      return
    }
    switch (node.type) {
      case 'function_declaration':
      case 'generator_function_declaration': {
        const name = fieldText(node, 'name')
        if (name) addSymbol(node, name, functionKind(name), exported)
        return
      }
      case 'class_declaration':
      case 'abstract_class_declaration': {
        const name = fieldText(node, 'name')
        if (!name) return
        addSymbol(node, name, 'class', exported)
        for (const member of node.childForFieldName('body')?.namedChildren ?? []) {
          if (member.type !== 'method_definition') continue
          const method = fieldText(member, 'name')
          if (method) addSymbol(member, method, 'method', exported, name)
        }
        return
      }
      case 'lexical_declaration':
      case 'variable_declaration':
        for (const declarator of node.namedChildren) {
          if (declarator.type !== 'variable_declarator') continue
          const target = declarator.childForFieldName('name')
          if (target?.type !== 'identifier') continue
          const name = target.text
          const value = declarator.childForFieldName('value')
          const isFunction =
            value?.type === 'arrow_function' ||
            value?.type === 'function_expression' ||
            value?.type === 'function'
          addSymbol(node, name, isFunction ? functionKind(name) : 'variable', exported)
        }
        return
      default:
        return
    }
  }

  for (const statement of root.namedChildren) {
    if (statement.type === 'export_statement') {
      const declaration = statement.childForFieldName('declaration')
      if (declaration) visitDeclaration(declaration, true)
      else if (statement.text.startsWith('export default')) {
        const value = statement.namedChildren.find((child) => child.type !== 'export_clause')
        if (value && (value.type === 'function_declaration' || value.type === 'arrow_function')) {
          addSymbol(statement, 'default', isJsx ? 'component' : 'function', true)
        }
      }
    } else {
      visitDeclaration(statement, false)
    }
  }

  const stack: Node[] = [root]
  while (stack.length > 0) {
    const node = stack.pop()
    if (!node) break
    collectNode(node, facts)
    stack.push(...node.namedChildren)
  }

  facts.imports.sort((a, b) => a.line - b.line)
  facts.calls.sort((a, b) => a.line - b.line)
  facts.pathProperties.sort((a, b) => a.line - b.line)
  return facts
}

function collectNode(node: Node, facts: FileFacts) {
  switch (node.type) {
    case 'import_statement':
    case 'export_statement': {
      const specifier = stringValue(node.childForFieldName('source'))
      if (specifier !== null) facts.imports.push({ specifier, line: lineOf(node) })
      return
    }
    case 'call_expression': {
      const callee = node.childForFieldName('function')
      const argument = node.childForFieldName('arguments')?.namedChildren[0] ?? null
      const firstString = stringValue(argument)
      if (!callee) return
      if (callee.type === 'import' || callee.text === 'require') {
        if (firstString !== null) facts.imports.push({ specifier: firstString, line: lineOf(node) })
      }
      const member = callee.type === 'member_expression' ? callee : null
      facts.calls.push({
        callee: callee.text.slice(0, 120),
        receiver: member ? (member.childForFieldName('object')?.text ?? null) : null,
        method: member ? (member.childForFieldName('property')?.text ?? null) : null,
        firstString,
        line: lineOf(node),
      })
      return
    }
    case 'pair': {
      const key = node.childForFieldName('key')
      const keyName = key?.type === 'string' ? stringValue(key) : (key?.text ?? null)
      const value = stringValue(node.childForFieldName('value'))
      if (keyName === 'path' && value !== null)
        facts.pathProperties.push({ value, line: lineOf(node) })
      return
    }
    case 'variable_declarator': {
      const name = fieldText(node, 'name')
      const value = node.childForFieldName('value')
      if (name && value?.type === 'call_expression') {
        const callee = value.childForFieldName('function')?.text
        if (callee) facts.constructors.push({ name, callee })
      }
      return
    }
    default:
      return
  }
}
