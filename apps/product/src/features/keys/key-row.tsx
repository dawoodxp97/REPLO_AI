import type { KeyDto } from '@replo/contracts'
import {
  Alert,
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@replo/ui'
import { useState } from 'react'
import { PROVIDER_LABELS } from './providers'
import { describeKeyError } from './key-errors'
import { useDeleteKey, useValidateKey } from './use-keys'

export function KeyRow({ keyDto }: { keyDto: KeyDto }) {
  const validate = useValidateKey()
  const remove = useDeleteKey()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const provider = PROVIDER_LABELS[keyDto.provider]

  return (
    <li className="flex flex-wrap items-start justify-between gap-4 py-4">
      <div className="min-w-0 space-y-1">
        <p className="text-sm font-medium">
          {provider} · {keyDto.label}
        </p>
        <p className="font-mono text-xs text-muted-foreground">…{keyDto.last4}</p>
        {validate.data ? (
          <p role="status" className="text-xs text-muted-foreground">
            {validate.data.valid
              ? 'The provider accepted this key.'
              : 'The provider rejected this key.'}
          </p>
        ) : null}
        {validate.isError ? (
          <p role="alert" className="text-xs text-destructive">
            {describeKeyError(validate.error)}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={validate.isPending}
          onClick={() => validate.mutate({ keyId: keyDto.id })}
        >
          {validate.isPending ? 'Checking…' : 'Check key'}
        </Button>
        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogTrigger render={<Button variant="destructive" size="sm" />}>Delete</DialogTrigger>
          <DialogContent>
            <DialogTitle>Delete the {provider} key?</DialogTitle>
            <DialogDescription>
              The key is removed from Replo at once and cannot be recovered. Tutorials still
              generating with it fail with KEY_REMOVED.
            </DialogDescription>
            {remove.isError ? (
              <Alert tone="destructive" role="alert">
                {describeKeyError(remove.error)}
              </Alert>
            ) : null}
            <div className="flex flex-wrap justify-end gap-2">
              <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
              <Button
                variant="destructive"
                disabled={remove.isPending}
                onClick={() =>
                  remove.mutate({ keyId: keyDto.id }, { onSuccess: () => setConfirmOpen(false) })
                }
              >
                {remove.isPending ? 'Deleting…' : 'Delete key'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </li>
  )
}
