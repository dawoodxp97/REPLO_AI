'use client'

import type { DeleteAccountInput } from '@replo/contracts'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  FormField,
  Input,
} from '@replo/ui'
import { useState } from 'react'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { RadioCardGroup, type RadioCardOption } from '@/components/radio-card-group'
import { useDeleteAccount } from './use-delete-account'

type PublicTutorials = DeleteAccountInput['publicTutorials']

const CONFIRM_WORD = 'DELETE'

const PUBLIC_TUTORIAL_OPTIONS = [
  {
    value: 'delete',
    title: 'Delete them',
    description: 'Public tutorials are removed with your account.',
  },
  {
    value: 'anonymise',
    title: 'Keep them',
    description: 'They stay public, without your name.',
  },
] as const satisfies readonly RadioCardOption<PublicTutorials>[]

export function DeleteAccountCard() {
  const { run } = useDeleteAccount()
  const [confirmText, setConfirmText] = useState('')
  const [publicTutorials, setPublicTutorials] = useState<PublicTutorials>('delete')

  function resetForm() {
    setConfirmText('')
    setPublicTutorials('delete')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Delete account</CardTitle>
        <CardDescription>Removes your keys, repositories, tutorials and progress.</CardDescription>
      </CardHeader>
      <CardContent>
        <ConfirmDialog
          triggerLabel="Delete account"
          triggerVariant="destructive"
          title="Delete your account?"
          description="This cannot be undone. Keys and progress are deleted at once."
          confirmLabel="Delete my account"
          confirmDisabled={confirmText !== CONFIRM_WORD}
          run={() => run(publicTutorials)}
          describeError={() => 'The account could not be deleted. Try again.'}
          onOpenChange={resetForm}
        >
          <FormField id="confirm-delete" label={`Type ${CONFIRM_WORD} to confirm`}>
            <Input
              id="confirm-delete"
              autoComplete="off"
              value={confirmText}
              onChange={(event) => setConfirmText(event.target.value)}
              className="font-mono"
            />
          </FormField>
          <RadioCardGroup
            name="public-tutorials"
            legend="Your public tutorials"
            options={PUBLIC_TUTORIAL_OPTIONS}
            value={publicTutorials}
            onChange={setPublicTutorials}
          />
        </ConfirmDialog>
      </CardContent>
    </Card>
  )
}
