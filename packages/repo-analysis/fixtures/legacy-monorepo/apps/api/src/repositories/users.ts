import type { Pool } from 'pg'
import type { User, UserInput } from '../models/user'

export function usersRepository(pool: Pool) {
  return {
    async find(email: string): Promise<User | undefined> {
      const result = await pool.query('select id, email, role from users where email = $1', [email])
      return result.rows[0]
    },
    async insert(input: UserInput): Promise<User> {
      const result = await pool.query(
        'insert into users (email, password_hash) values ($1, crypt($2, gen_salt($$bf$$))) returning id, email, role',
        [input.email, input.password],
      )
      return result.rows[0]
    },
  }
}
