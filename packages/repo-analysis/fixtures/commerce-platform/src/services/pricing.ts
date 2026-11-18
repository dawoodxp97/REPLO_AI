import type { OrderLine } from '../domain/order'

export function orderTotal(lines: readonly OrderLine[]): number {
  return lines.reduce((total, line) => total + line.product.priceCents * line.quantity, 0)
}

export function withTax(totalCents: number, rate: number): number {
  return Math.round(totalCents * (1 + rate))
}
