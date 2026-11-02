'use client'

import { DeleteAccountInput } from '@replo/contracts'
import { useMutation } from '@tanstack/react-query'
import { useSignOut } from '@/components/app-shell/use-sign-out'
import { orpc } from '@/lib/orpc'

export const DELETE_CONFIRM_WORD = DeleteAccountInput.shape.confirm.value

export function useDeleteAccount() {
  const deleteAccount = useMutation(orpc.me.deleteAccount.mutationOptions())
  const { signOut } = useSignOut()

  async function run(publicTutorials: DeleteAccountInput['publicTutorials']) {
    await deleteAccount.mutateAsync({ confirm: DELETE_CONFIRM_WORD, publicTutorials })
    await signOut().catch(() => undefined)
  }

  return { run }
}
