import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { z } from 'zod'

const KEY_BYTES = 32
const SALT_BYTES = 16
const MAX_MEMORY_BYTES = 64 * 1024 * 1024
const COST = { N: 2 ** 15, r: 8, p: 1 } as const

const StoredHash = z.tuple([
  z.literal('scrypt'),
  z.coerce.number().int().positive(),
  z.coerce.number().int().positive(),
  z.coerce.number().int().positive(),
  z.string().min(1),
  z.string().min(1),
])

interface Cost {
  N: number
  r: number
  p: number
}

function derive(password: string, salt: Buffer, cost: Cost): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_BYTES, { ...cost, maxmem: MAX_MEMORY_BYTES }, (error, key) =>
      error ? reject(error) : resolve(key),
    )
  })
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES)
  const key = await derive(password, salt, COST)
  return [
    'scrypt',
    COST.N,
    COST.r,
    COST.p,
    salt.toString('base64url'),
    key.toString('base64url'),
  ].join('$')
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parsed = StoredHash.safeParse(stored.split('$'))
  if (!parsed.success) return false
  const [, N, r, p, saltText, hashText] = parsed.data
  const expected = Buffer.from(hashText, 'base64url')
  const actual = await derive(password, Buffer.from(saltText, 'base64url'), { N, r, p })
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}
