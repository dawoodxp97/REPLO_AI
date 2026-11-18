import type { Pool } from 'pg'
import type { Product, ProductInput } from '../domain/product'

export function productRepository(pool: Pool) {
  return {
    async list(): Promise<Product[]> {
      const result = await pool.query('select id, name, price_cents, stock from products')
      return result.rows
    },
    async create(input: ProductInput): Promise<Product> {
      const result = await pool.query(
        'insert into products (name, price_cents, stock) values ($1, $2, $3) returning *',
        [input.name, input.priceCents, input.stock],
      )
      return result.rows[0]
    },
  }
}
