const { log } = require('./logger')

const handlers = new Map()

function register(name, handler) {
  handlers.set(name, handler)
  log('info', 'job registered', { name })
}

async function run(name, payload) {
  const handler = handlers.get(name)
  if (!handler) throw new Error(`unknown job ${name}`)
  return handler(payload)
}

module.exports = { register, run }
