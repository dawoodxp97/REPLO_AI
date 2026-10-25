import { z } from 'zod'

export const SHAPES = [
  'rest-api',
  'nextjs-saas',
  'nextjs-pages',
  'redux-spa',
  'spa-router',
  'monorepo',
  'cli-or-library',
  'legacy-js',
] as const

export const Route = z.object({ method: z.string(), pattern: z.string(), path: z.string() })

export function routeKey(route: z.infer<typeof Route>): string {
  return `${route.method}|${route.pattern}|${route.path}`
}

export const IndexExpectations = z.object({
  entryPoints: z.array(z.object({ path: z.string(), kind: z.string() })),
  routes: z.array(Route),
  imports: z.array(z.tuple([z.string(), z.string()])),
  symbols: z.array(z.string()),
  unresolvedImports: z.number().int().nonnegative(),
  parseErrors: z.array(z.string()),
})
export type IndexExpectations = z.infer<typeof IndexExpectations>

export const TruthSheet = z.object({
  repo: z.object({ owner: z.string(), name: z.string(), commitSha: z.string().length(40) }),
  source: z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('fixture'), path: z.string() }),
    z.object({ kind: z.literal('github'), url: z.string().url() }),
  ]),
  shape: z.enum(SHAPES),
  size: z.enum(['small', 'medium', 'large']),
  entryPoints: z.array(z.string()).min(1),
  keyFlows: z
    .array(z.object({ name: z.string(), hops: z.array(z.string()).min(1) }))
    .min(3)
    .max(5),
  coreModules: z.array(z.string()).min(1),
  facts: z.array(z.object({ claim: z.string(), evidencePath: z.string() })).length(10),
  index: IndexExpectations,
})
export type TruthSheet = z.infer<typeof TruthSheet>

export const PIPELINE_METRICS = [
  'referenceValidityPost',
  'referenceValidityPre',
  'fabricatedIdentifiersPer1kWords',
  'claimSupport',
  'coverage',
  'sequencing',
  'quizQuality',
  'costUsd',
  'latencyMs',
] as const
