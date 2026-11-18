const { orderTotal } = require('../dist/services/pricing')

function report(orders) {
  return orders.map((order) => ({ id: order.id, total: orderTotal(order.lines) }))
}

module.exports = { report }
