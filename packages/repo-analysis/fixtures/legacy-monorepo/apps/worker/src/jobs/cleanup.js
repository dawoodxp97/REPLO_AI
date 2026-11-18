const { log } = require('../lib/logger')

async function cleanupSessions() {
  log('info', 'sessions cleaned')
}

module.exports = { cleanupSessions }
