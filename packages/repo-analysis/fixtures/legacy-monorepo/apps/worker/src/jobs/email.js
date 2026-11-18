const { log } = require('../lib/logger')

async function sendEmail(payload) {
  log('info', 'email queued', { to: payload.to })
}

module.exports = { sendEmail }
