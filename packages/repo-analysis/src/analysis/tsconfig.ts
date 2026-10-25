import { z } from 'zod'
import { joinPath } from './paths'

export interface CompilerPaths {
  baseUrl: string | undefined
  paths: Record<string, string[]>
}

const TsConfig = z.object({
  compilerOptions: z
    .object({
      baseUrl: z.string().optional(),
      paths: z.record(z.string(), z.array(z.string())).optional(),
    })
    .optional(),
})

export const EMPTY_COMPILER_PATHS: CompilerPaths = { baseUrl: undefined, paths: {} }

export function stripJsonc(text: string): string {
  let out = ''
  let trailingComma = -1
  let i = 0
  while (i < text.length) {
    const char = text[i] ?? ''
    if (char === '"') {
      const start = i
      i += 1
      while (i < text.length && text[i] !== '"') i += text[i] === '\\' ? 2 : 1
      i += 1
      out += text.slice(start, i)
      trailingComma = -1
      continue
    }
    if (char === '/' && text[i + 1] === '/') {
      while (i < text.length && text[i] !== '\n') i += 1
      continue
    }
    if (char === '/' && text[i + 1] === '*') {
      const end = text.indexOf('*/', i + 2)
      i = end === -1 ? text.length : end + 2
      continue
    }
    if (char === ',') {
      trailingComma = out.length
    } else if (char === '}' || char === ']') {
      if (trailingComma !== -1) out = out.slice(0, trailingComma) + out.slice(trailingComma + 1)
      trailingComma = -1
    } else if (!/\s/.test(char)) {
      trailingComma = -1
    }
    out += char
    i += 1
  }
  return out
}

export function parseCompilerPaths(text: string | undefined, configDir: string): CompilerPaths {
  if (text === undefined) return EMPTY_COMPILER_PATHS
  let raw: unknown
  try {
    raw = JSON.parse(stripJsonc(text))
  } catch {
    return EMPTY_COMPILER_PATHS
  }
  const parsed = TsConfig.safeParse(raw)
  if (!parsed.success) return EMPTY_COMPILER_PATHS
  const options = parsed.data.compilerOptions
  return {
    baseUrl: options?.baseUrl === undefined ? undefined : joinPath(configDir, options.baseUrl),
    paths: options?.paths ?? {},
  }
}
