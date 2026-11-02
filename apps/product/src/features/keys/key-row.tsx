'use client'

import type { KeyDto } from '@replo/contracts'
import { Button, Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from '@replo/ui'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { describeKeyError } from './key-errors'
import { keyMask, keyTitle } from './format-key-label'
import { KeyValidationStatus } from './key-validation-status'
import { LLM_PROVIDER_LABELS } from './providers'
import { useDeleteKey, useValidateKey } from './use-keys'

export function KeyRow({ keyDto }: { keyDto: KeyDto }) {
  const validate = useValidateKey()
  const remove = useDeleteKey()

  return (
    <Item>
      <ItemContent>
        <ItemTitle>{keyTitle(keyDto)}</ItemTitle>
        <ItemDescription className="font-mono text-xs">{keyMask(keyDto)}</ItemDescription>
        <KeyValidationStatus
          result={validate.data}
          error={validate.error}
          isError={validate.isError}
        />
      </ItemContent>
      <ItemActions>
        <Button
          variant="outline"
          size="sm"
          disabled={validate.isPending}
          onClick={() => validate.mutate({ keyId: keyDto.id })}
        >
          {validate.isPending ? 'Checking…' : 'Check key'}
        </Button>
        <ConfirmDialog
          triggerLabel="Delete"
          title={`Delete the ${LLM_PROVIDER_LABELS[keyDto.provider]} key?`}
          description="The key is removed from Replo at once and cannot be recovered. Any tutorial still generating with it will stop and need to be restarted with another key."
          confirmLabel="Delete key"
          run={() => remove.mutateAsync({ keyId: keyDto.id })}
          describeError={describeKeyError}
        />
      </ItemActions>
    </Item>
  )
}
