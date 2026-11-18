import { randomUUID } from 'node:crypto'
import type { Order, OrderInput } from '../domain/order'
import type { Product } from '../domain/product'
import { hasStock, reserve } from './inventory'
import { orderTotal, withTax } from './pricing'

export interface OrderDeps {
  findProduct(id: string): Promise<Product | undefined>
  save(order: Order): Promise<Order>
}

export function createOrderService(deps: OrderDeps) {
  return {
    async place(input: OrderInput): Promise<Order> {
      const product = await deps.findProduct(input.productId)
      if (!product) throw new Error('PRODUCT_NOT_FOUND')
      if (!hasStock(product, input.quantity)) throw new Error('OUT_OF_STOCK')
      const line = { product: reserve(product, input.quantity), quantity: input.quantity }
      const order: Order = {
        id: randomUUID(),
        lines: [line],
        totalCents: withTax(orderTotal([line]), 0.21),
        status: 'open',
      }
      return deps.save(order)
    },
  }
}
