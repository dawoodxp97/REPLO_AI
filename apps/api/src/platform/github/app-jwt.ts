import { createSign } from 'node:crypto'

const CLOCK_SKEW_SECONDS = 60
const TOKEN_LIFETIME_SECONDS = 540

const base64Url = (value: string) => Buffer.from(value).toString('base64url')

export function createAppJwt(appId: string, privateKeyPem: string, nowSeconds: number): string {
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const payload = base64Url(
    JSON.stringify({
      iat: nowSeconds - CLOCK_SKEW_SECONDS,
      exp: nowSeconds + TOKEN_LIFETIME_SECONDS,
      iss: appId,
    }),
  )
  const signingInput = `${header}.${payload}`
  const signature = createSign('RSA-SHA256')
    .update(signingInput)
    .sign(privateKeyPem.replace(/\\n/g, '\n'), 'base64url')
  return `${signingInput}.${signature}`
}
