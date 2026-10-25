var handlers = require('./handlers')
var _ = require('lodash')

function route(path) {
  var handler = handlers.table[path]
  return handler ? handler() : _.noop()
}

module.exports = { route: route }
