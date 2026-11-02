'use client'

import type { DeleteAccountInput } from '@replo/contracts'
import { useMutation } from '@tanstack/react-query'
import { useSignOut } from '@/components/app-shell/use-sign-out'
import { orpc } from '@/lib/orpc'

export function useDeleteAccount() {
  const deleteAccount = useMutation(orpc.me.deleteAccount.mutationOptions())
  const { signOut } = useSignOut()

  async function run(publicTutorials: DeleteAccountInput['publicTutorials']) {
    await deleteAccount.mutateAsync({ confirm: 'DELETE', publicTutorials })
    await signOut().catch(() => undefined)
  }

  return { run }
}
