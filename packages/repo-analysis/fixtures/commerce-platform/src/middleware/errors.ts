import type { NextFunction, Request, Response } from 'express'

export function errorHandler(error: Error, _request: Request, response: Response, _next: NextFunction) {
  const status = error.message === 'PRODUCT_NOT_FOUND' ? 404 : 400
  response.status(status).json({ error: error.message })
}
