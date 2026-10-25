import { randomUUID } from 'node:crypto'

const CLIENT_REQUEST_ID = /^[A-Za-z0-9._-]{8,128}$/

export function requestIdFrom(header: string | string[] | undefined): string {
  const value = Array.isArray(header) ? header[0] : header
  return value !== undefined && CLIENT_REQUEST_ID.test(value) ? value : randomUUID()
}
