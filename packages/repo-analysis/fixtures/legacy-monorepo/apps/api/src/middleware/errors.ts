import type { NextFunction, Request, Response } from 'express'

export function errors(error: Error, _request: Request, response: Response, _next: NextFunction) {
  response.status(400).json({ error: error.message })
}
