import { Router } from 'express'

export const usersRouter = Router()

usersRouter.get('/users/me', (_request, response) => {
  response.json({ email: 'member@example.test' })
})
