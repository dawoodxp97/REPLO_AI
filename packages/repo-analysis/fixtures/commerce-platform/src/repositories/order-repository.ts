import type { Pool } from 'pg'
import type { Order } from '../domain/order'

export function orderRepository(pool: Pool) {
  return {
    async list(): Promise<Order[]> {
      const result = await pool.query('select id, lines, total_cents, status from orders')
      return result.rows
    },
    async insert(order: Order): Promise<Order> {
      const result = await pool.query(
        'insert into orders (id, lines, total_cents, status) values ($1, $2, $3, $4) returning *',
        [order.id, JSON.stringify(order.lines), order.totalCents, order.status],
      )
      return result.rows[0]
    },
  }
}
