import Fastify from 'fastify'
import { dbPlugin } from './plugins/db'

const app = Fastify()

app.register(dbPlugin)

app.get('/ping', async () => ({ pong: true }))

app.listen({ port: 3000 })
