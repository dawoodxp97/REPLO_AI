import express from 'express'
import { usersRouter } from 'routes/users'

const app = express()

app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

app.use('/api', usersRouter)

app.listen(4000)
