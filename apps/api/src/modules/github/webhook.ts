import { createHmac, timingSafeEqual } from 'node:crypto'

export function verifyGithubSignature(
  secret: string,
  rawBody: Buffer | string,
  signatureHeader: string | undefined,
): boolean {
  if (!signatureHeader?.startsWith('sha256=')) return false
  const hex = signatureHeader.slice('sha256='.length)
  if (!/^[0-9a-f]{64}$/i.test(hex)) return false
  const expected = createHmac('sha256', secret).update(rawBody).digest()
  return timingSafeEqual(Buffer.from(hex, 'hex'), expected)
}
