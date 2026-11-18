import type { Product } from './product'

export interface OrderLine {
  product: Product
  quantity: number
}

export interface Order {
  id: string
  lines: OrderLine[]
  totalCents: number
  status: 'open' | 'paid' | 'cancelled'
}

export interface OrderInput {
  productId: string
  quantity: number
}
