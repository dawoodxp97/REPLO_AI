import type { FastifyInstance, RawServerDefault } from 'fastify'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Logger } from 'pino'

export type App = FastifyInstance<RawServerDefault, IncomingMessage, ServerResponse, Logger>
