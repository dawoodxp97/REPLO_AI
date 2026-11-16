'use client'

import { DeleteAccountInput } from '@replo/contracts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@replo/ui'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { useSignOut } from '@/components/app-shell/use-sign-out'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { TextField } from '@/components/text-field'
import { orpc } from '@/lib/orpc'

const DELETE_CONFIRM_WORD = DeleteAccountInput.shape.confirm.value

function useDeleteAccount() {
  const deleteAccount = useMutation(orpc.me.deleteAccount.mutationOptions())
  const { signOut } = useSignOut()

  async function run() {
    await deleteAccount.mutateAsync({ confirm: DELETE_CONFIRM_WORD })
    await signOut().catch(() => undefined)
  }

  return { run }
}

export function DeleteAccountCard() {
  const { run } = useDeleteAccount()
  const [confirmText, setConfirmText] = useState('')

  return (
    <Card>
      <CardHeader>
        <CardTitle>Delete account</CardTitle>
        <CardDescription>Removes your keys, repositories, courses and progress.</CardDescription>
      </CardHeader>
      <CardContent>
        <ConfirmDialog
          triggerLabel="Delete account"
          triggerVariant="destructive"
          title="Delete your account?"
          description="This cannot be undone. Keys and progress are deleted at once."
          confirmLabel="Delete my account"
          confirmDisabled={confirmText !== DELETE_CONFIRM_WORD}
          run={run}
          describeError={() => 'The account could not be deleted. Try again.'}
          onOpenChange={() => setConfirmText('')}
        >
          <TextField
            id="confirm-delete"
            label={`Type ${DELETE_CONFIRM_WORD} to confirm`}
            autoComplete="off"
            value={confirmText}
            onChange={(event) => setConfirmText(event.target.value)}
            className="font-mono"
          />
        </ConfirmDialog>
      </CardContent>
    </Card>
  )
}
