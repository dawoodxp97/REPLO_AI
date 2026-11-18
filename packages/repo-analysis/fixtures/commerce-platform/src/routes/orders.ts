import { Router } from 'express'
import { createOrderService } from '../services/orders'
import { orderRepository } from '../repositories/order-repository'
import { productRepository } from '../repositories/product-repository'
import type { Pool } from 'pg'

export function ordersRouter(pool: Pool) {
  const orders = orderRepository(pool)
  const products = productRepository(pool)
  const service = createOrderService({
    findProduct: async (id) => (await products.list()).find((product) => product.id === id),
    save: (order) => orders.insert(order),
  })
  const router = Router()

  router.get('/orders', async (_request, response) => {
    response.json(await orders.list())
  })

  router.post('/orders', async (request, response) => {
    response.status(201).json(await service.place(request.body))
  })

  return router
}
