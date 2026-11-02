import { isIP } from 'node:net'

export type TrustProxy = boolean | number | string[]

const KEYWORDS = new Set(['loopback', 'linklocal', 'uniquelocal'])
const HOPS = /^\d+$/

function isTrustedAddress(entry: string): boolean {
  if (KEYWORDS.has(entry)) return true
  const [address = '', prefix, ...rest] = entry.split('/')
  const family = isIP(address)
  if (family === 0 || rest.length > 0) return false
  if (prefix === undefined) return true
  return HOPS.test(prefix) && Number(prefix) <= (family === 4 ? 32 : 128)
}

function entriesOf(value: string): string[] {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry !== '')
}

export function isValidTrustProxy(value: string): boolean {
  const trimmed = value.trim()
  if (trimmed === 'false' || HOPS.test(trimmed)) return true
  const entries = entriesOf(trimmed)
  return entries.length > 0 && entries.every(isTrustedAddress)
}

export function parseTrustProxy(value: string): TrustProxy {
  const trimmed = value.trim()
  if (trimmed === 'false') return false
  if (HOPS.test(trimmed)) {
    const hops = Number(trimmed)
    return hops === 0 ? false : hops
  }
  return entriesOf(trimmed)
}

export function defaultTrustProxy(nodeEnv: 'development' | 'test' | 'production'): TrustProxy {
  return nodeEnv === 'production' ? 1 : false
}

type FastifyTrustProxy = boolean | string[] | ((address: string, hop: number) => boolean)

export function toFastifyTrustProxy(value: TrustProxy): FastifyTrustProxy {
  return typeof value === 'number' ? (_address, hop) => hop < value : value
}
