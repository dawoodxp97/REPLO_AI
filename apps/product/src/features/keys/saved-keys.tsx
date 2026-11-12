'use client'

import type { KeyDto } from '@replo/contracts'
import {
  Button,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
  Skeleton,
} from '@replo/ui'
import { CircleAlert, CircleCheck } from 'lucide-react'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { QueryBoundary } from '@/components/query-boundary'
import { describeKeyError } from './key-errors'
import { keyMask, keyTitle } from './format-key-label'
import { LLM_PROVIDER_LABELS } from './providers'
import { useDeleteKey, useKeys, useValidateKey } from './use-keys'

export function SavedKeys() {
  const keys = useKeys()

  return (
    <QueryBoundary
      query={keys}
      errorTitle="We could not load your keys"
      errorDescription="Check your connection, then try again."
      loading={<Skeleton aria-busy="true" className="h-16 w-full" />}
    >
      {(saved) =>
        saved.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>No keys saved</EmptyTitle>
              <EmptyDescription>Add a key below to start generating tutorials.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ItemGroup>
            {saved.map((key) => (
              <KeyRow key={key.id} keyDto={key} />
            ))}
          </ItemGroup>
        )
      }
    </QueryBoundary>
  )
}

function KeyRow({ keyDto }: { keyDto: KeyDto }) {
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

interface KeyValidationStatusProps {
  result: { valid: boolean } | undefined
  error: unknown
  isError: boolean
}

function KeyValidationStatus({ result, error, isError }: KeyValidationStatusProps) {
  if (isError) {
    return (
      <p role="alert" className="flex items-center gap-1.5 text-compact text-destructive">
        <CircleAlert className="size-3.5" />
        {describeKeyError(error)}
      </p>
    )
  }
  if (!result) return null
  if (result.valid) {
    return (
      <p role="status" className="flex items-center gap-1.5 text-compact text-observed-text">
        <CircleCheck className="size-3.5" />
        The provider accepted this key.
      </p>
    )
  }
  return (
    <p role="status" className="flex items-center gap-1.5 text-compact text-destructive">
      <CircleAlert className="size-3.5" />
      The provider rejected this key.
    </p>
  )
}
