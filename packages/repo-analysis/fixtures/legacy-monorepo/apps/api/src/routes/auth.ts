import { Router } from 'express'

export const authRouter = Router()

authRouter.post('/auth/sign-in', (_request, response) => {
  response.json({ token: 'signed' })
})

authRouter.post('/auth/register', (_request, response) => {
  response.status(201).json({ id: 'new-user' })
})
