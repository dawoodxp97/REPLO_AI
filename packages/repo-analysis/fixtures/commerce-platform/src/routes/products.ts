import { Router } from 'express'
import { createProductService } from '../services/products'
import { productRepository } from '../repositories/product-repository'
import type { Pool } from 'pg'

export function productsRouter(pool: Pool) {
  const service = createProductService(productRepository(pool))
  const router = Router()

  router.get('/products', async (_request, response) => {
    response.json(await service.list())
  })

  router.post('/products', async (request, response) => {
    response.status(201).json(await service.create(request.body))
  })

  return router
}
