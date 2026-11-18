import express from 'express'
import type { Config } from './config'
import { createPool } from './db/client'
import { errorHandler } from './middleware/errors'
import { auth } from './middleware/auth'
import { healthRouter } from './routes/health'
import { ordersRouter } from './routes/orders'
import { productsRouter } from './routes/products'

export function createApp(config: Config) {
  const pool = createPool(config)
  const app = express()

  app.use(express.json())
  app.use(auth)
  app.use('/health', healthRouter)
  app.use('/api/orders', ordersRouter(pool))
  app.use('/api/products', productsRouter(pool))
  app.use(errorHandler)

  return app
}
