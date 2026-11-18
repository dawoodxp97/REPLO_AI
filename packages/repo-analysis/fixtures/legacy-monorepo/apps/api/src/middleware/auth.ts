import type { NextFunction, Request, Response } from 'express'

export function requireAdmin(request: Request, response: Response, next: NextFunction) {
  if (request.header('x-role') !== 'admin') {
    response.status(403).json({ error: 'FORBIDDEN' })
    return
  }
  next()
}
