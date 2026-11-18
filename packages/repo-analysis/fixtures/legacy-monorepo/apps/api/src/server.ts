import express from 'express'
import { authRouter } from './routes/auth'
import { usersRouter } from './routes/users'
import { reportsRouter } from './routes/reports'
import { errors } from './middleware/errors'

const app = express()

app.use(express.json())
app.use(authRouter)
app.use(usersRouter)
app.use(reportsRouter)
app.use(errors)

app.listen(4200)
