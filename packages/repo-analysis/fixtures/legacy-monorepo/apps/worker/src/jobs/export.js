const { log } = require('../lib/logger')

async function exportReport(payload) {
  log('info', 'report exported', { reportId: payload.reportId })
}

module.exports = { exportReport }
