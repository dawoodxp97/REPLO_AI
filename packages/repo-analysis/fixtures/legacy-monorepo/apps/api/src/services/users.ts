import type { usersRepository } from '../repositories/users'

export function usersService(users: ReturnType<typeof usersRepository>) {
  return {
    find: (email: string) => users.find(email),
  }
}
