import { create } from 'zustand'

interface SessionState {
  email: string | null
  signIn(email: string): void
  signOut(): void
}

export const useSession = create<SessionState>((set) => ({
  email: null,
  signIn: (email) => set({ email }),
  signOut: () => set({ email: null }),
}))
