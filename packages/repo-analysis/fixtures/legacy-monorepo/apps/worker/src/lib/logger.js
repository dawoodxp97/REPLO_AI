function log(level, message, fields) {
  console.log(JSON.stringify({ level, message, ...fields }))
}

module.exports = { log }
