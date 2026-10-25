import { Router } from 'express'

export const usersRouter = Router()

usersRouter.get('/users', (_req, res) => {
  res.json([])
})

usersRouter.post('/users', (_req, res) => {
  res.status(201).end()
})
