import type { User, UserInput } from '../models/user'
import type { usersRepository } from '../repositories/users'

export function authService(users: ReturnType<typeof usersRepository>) {
  return {
    async signIn(input: UserInput): Promise<User | undefined> {
      const user = await users.find(input.email)
      return user
    },
    async register(input: UserInput): Promise<User> {
      return users.insert(input)
    },
  }
}
