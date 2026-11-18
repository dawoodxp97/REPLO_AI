const { register } = require('./lib/queue')
const { sendEmail } = require('./jobs/email')
const { exportReport } = require('./jobs/export')
const { cleanupSessions } = require('./jobs/cleanup')

register('email', sendEmail)
register('export', exportReport)
register('cleanup', cleanupSessions)
