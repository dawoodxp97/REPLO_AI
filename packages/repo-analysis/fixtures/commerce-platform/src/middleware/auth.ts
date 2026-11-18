import type { NextFunction, Request, Response } from 'express'

export function auth(request: Request, response: Response, next: NextFunction) {
  const token = request.header('authorization')
  if (token === undefined) {
    response.status(401).json({ error: 'AUTH_REQUIRED' })
    return
  }
  next()
}
