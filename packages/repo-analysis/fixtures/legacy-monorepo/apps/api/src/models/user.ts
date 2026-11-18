export interface User {
  id: string
  email: string
  role: 'member' | 'admin'
}

export interface UserInput {
  email: string
  password: string
}
