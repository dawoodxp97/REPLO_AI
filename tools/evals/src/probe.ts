import { z } from 'zod'
import { Route, routeKey, type TruthSheet } from './truth-sheet'

export const ProbeOutput = z.object({
  entryPoints: z.array(z.string()),
  routes: z.array(Route),
})
export type ProbeOutput = z.infer<typeof ProbeOutput>

export interface ProbeInput {
  files: string[]
  framework: string | null
  scripts: Record<string, string>
}

export interface ProbeCompletion {
  output: unknown
  latencyMs: number
  costUsd: number
}

export type Completer = (prompt: { system: string; user: string }) => Promise<ProbeCompletion>

const MAX_FILES = 400

export function probePrompt(input: ProbeInput): { system: string; user: string } {
  const files = input.files.slice(0, MAX_FILES)
  return {
    system: [
      'You read the file list and package scripts of one repository and name its entry points and HTTP or page routes.',
      'Answer with JSON only, using exactly the keys entryPoints and routes.',
      'Every path you return must appear verbatim in the file list. Do not invent paths.',
    ].join('\n'),
    user: [
      `framework: ${input.framework ?? 'unknown'}`,
      `scripts: ${JSON.stringify(input.scripts)}`,
      `files (${input.files.length} total${input.files.length > MAX_FILES ? `, first ${MAX_FILES} shown` : ''}):`,
      ...files,
    ].join('\n'),
  }
}

export interface ProbeScore {
  schemaValid: number
  referenceValidityPre: number
  fabricatedPaths: number
  entryRecall: number
  routeRecall: number
  latencyMs: number
  costUsd: number
}

export function scoreProbe(
  truth: TruthSheet,
  files: readonly string[],
  completion: ProbeCompletion,
): ProbeScore {
  const parsed = ProbeOutput.safeParse(completion.output)
  if (!parsed.success)
    return {
      schemaValid: 0,
      referenceValidityPre: 0,
      fabricatedPaths: 0,
      entryRecall: 0,
      routeRecall: 0,
      latencyMs: completion.latencyMs,
      costUsd: completion.costUsd,
    }
  const known = new Set(files)
  const returned = parsed.data.entryPoints
  const valid = returned.filter((path) => known.has(path))
  const wanted = new Set(truth.entryPoints)
  const found = new Set(returned)
  const routeKeys = new Set(parsed.data.routes.map(routeKey))
  const wantedRoutes = truth.index.routes.map(routeKey)
  return {
    schemaValid: 1,
    referenceValidityPre: returned.length === 0 ? 1 : valid.length / returned.length,
    fabricatedPaths: returned.length - valid.length,
    entryRecall:
      wanted.size === 0 ? 1 : [...wanted].filter((path) => found.has(path)).length / wanted.size,
    routeRecall:
      wantedRoutes.length === 0
        ? 1
        : wantedRoutes.filter((key) => routeKeys.has(key)).length / wantedRoutes.length,
    latencyMs: completion.latencyMs,
    costUsd: completion.costUsd,
  }
}
