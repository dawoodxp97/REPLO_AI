import { z } from 'zod'
import { KEY_BYTES } from './crypto/key-vault'
import { defaultTrustProxy, isValidTrustProxy, parseTrustProxy } from './trust-proxy'

const emptyToUndefined = (v: unknown) => (v === '' ? undefined : v)
const optionalString = z.preprocess(emptyToUndefined, z.string().optional())
const trustProxy = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .refine(
      isValidTrustProxy,
      'TRUST_PROXY must be a hop count, "false", or a comma-separated list of IPs, CIDRs or loopback|linklocal|uniquelocal',
    )
    .transform(parseTrustProxy)
    .optional(),
)

const Env = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(7200),
  WORKER_HEALTH_PORT: z.coerce.number().int().positive().default(7201),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

  DATABASE_URL: z.string().min(1),
  DB_POOL_MAX: z.coerce.number().int().positive().default(10),

  API_PUBLIC_URL: z.url(),
  AUTH_COOKIE_DOMAIN: optionalString,
  PRODUCT_ORIGIN: z.url(),
  TRUST_PROXY: trustProxy,

  GOOGLE_CLIENT_ID: optionalString,
  GOOGLE_CLIENT_SECRET: optionalString,

  GITHUB_APP_ID: optionalString,
  GITHUB_APP_PRIVATE_KEY: optionalString,
  GITHUB_APP_CLIENT_ID: optionalString,
  GITHUB_APP_CLIENT_SECRET: optionalString,
  GITHUB_WEBHOOK_SECRET: optionalString,
  GITHUB_APP_SLUG: optionalString,

  KEY_ENCRYPTION_KEY: z
    .string()
    .refine(
      (v) => Buffer.from(v, 'base64').length === KEY_BYTES,
      'KEY_ENCRYPTION_KEY must be base64 of exactly 32 bytes',
    ),
  KEY_ENCRYPTION_KEY_VERSION: z.coerce.number().int().positive().default(1),

  MAX_LITE_PIPELINE_FILES: z.coerce.number().int().positive().default(300),
  DEFAULT_BYOK_JOB_BUDGET_USD: z.coerce.number().positive().default(2),
  WORKER_CONCURRENCY: z.coerce.number().int().positive().default(1),
  MAX_REPO_FILES: z.coerce.number().int().positive().default(5000),
  MAX_REPO_BYTES: z.coerce.number().int().positive().default(50_000_000),
  SNAPSHOT_DIR: optionalString,
})

const PRODUCTION_REQUIRED = [
  'GITHUB_APP_ID',
  'GITHUB_APP_PRIVATE_KEY',
  'GITHUB_APP_CLIENT_ID',
  'GITHUB_APP_CLIENT_SECRET',
  'GITHUB_WEBHOOK_SECRET',
] as const

const CREDENTIAL_PAIRS = [
  ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
  ['GITHUB_APP_CLIENT_ID', 'GITHUB_APP_CLIENT_SECRET'],
] as const

const EnvSchema = Env.superRefine((env, ctx) => {
  for (const pair of CREDENTIAL_PAIRS) {
    for (const [present, missing] of [pair, [pair[1], pair[0]] as const]) {
      if (env[present] && !env[missing])
        ctx.addIssue({
          code: 'custom',
          path: [missing],
          message: `${missing} is required when ${present} is set`,
        })
    }
  }
  if (env.NODE_ENV !== 'production') return
  for (const key of PRODUCTION_REQUIRED) {
    if (!env[key])
      ctx.addIssue({ code: 'custom', path: [key], message: `${key} is required in production` })
  }
}).transform((env) => ({
  ...env,
  TRUST_PROXY: env.TRUST_PROXY ?? defaultTrustProxy(env.NODE_ENV),
}))

export type Config = z.infer<typeof EnvSchema>

export function loadConfig(source: NodeJS.ProcessEnv = process.env): Config {
  const parsed = EnvSchema.safeParse(source)
  if (!parsed.success) {
    const lines = parsed.error.issues.map(
      (i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`,
    )
    console.error(`Invalid environment:\n${lines.join('\n')}`)
    process.exit(1)
  }
  return parsed.data
}
