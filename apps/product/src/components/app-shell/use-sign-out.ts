'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { orpc } from '@/lib/orpc'

export function useSignOut() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const signOut = useMutation(orpc.auth.signOut.mutationOptions())

  async function run() {
    try {
      await signOut.mutateAsync()
    } finally {
      queryClient.clear()
      router.replace('/login')
    }
  }

  return { signOut: run, isPending: signOut.isPending }
}
