import { Router } from 'express'

export const reportsRouter = Router()

reportsRouter.get('/reports', (_request, response) => {
  response.json([])
})

reportsRouter.post('/reports', (_request, response) => {
  response.status(201).json({ id: 'new-report' })
})
