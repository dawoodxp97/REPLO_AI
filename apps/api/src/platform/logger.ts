import pino, { type DestinationStream, type Logger } from 'pino'
import type { Config } from './config'

const KEY_PATTERNS: RegExp[] = [
  /sk-or-v1-[A-Za-z0-9]{16,}/g,
  /sk-ant-[A-Za-z0-9_-]{16,}/g,
  /sk-(?:proj-)?[A-Za-z0-9_-]{20,}/g,
  /AIza[0-9A-Za-z_-]{30,}/g,
  /gh[pousr]_[A-Za-z0-9]{30,}/g,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
]

export function redactSecrets(input: string): string {
  return KEY_PATTERNS.reduce((acc, re) => acc.replace(re, '[REDACTED]'), input)
}

const SECRET_FIELDS = [
  'apiKey',
  'decryptedKey',
  'ciphertext',
  'token',
  'accessToken',
  'refreshToken',
  'password',
]

const REDACT_PATHS = [
  ...SECRET_FIELDS,
  ...SECRET_FIELDS.map((field) => `*.${field}`),
  'authorization',
  'cookie',
  'req.headers.authorization',
  'req.headers.cookie',
]

export function createLogger(
  opts: { level: Config['LOG_LEVEL']; pretty?: boolean; name?: string },
  destination?: DestinationStream,
): Logger {
  const options: pino.LoggerOptions = {
    level: opts.level,
    ...(opts.name ? { name: opts.name } : {}),
    redact: { paths: REDACT_PATHS, censor: '[REDACTED]' },
    hooks: {
      logMethod(args, method) {
        const scrubbed = args.map((a) =>
          typeof a === 'string' ? redactSecrets(a) : a,
        ) as Parameters<typeof method>
        method.apply(this, scrubbed)
      },
    },
    formatters: {
      log(obj) {
        const out: Record<string, unknown> = {}
        for (const [k, v] of Object.entries(obj))
          out[k] = typeof v === 'string' ? redactSecrets(v) : v
        return out
      },
    },
  }
  if (opts.pretty && !destination) {
    return pino({ ...options, transport: { target: 'pino-pretty', options: { colorize: true } } })
  }
  return destination ? pino(options, destination) : pino(options)
}
