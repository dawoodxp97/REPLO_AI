import type { ImportRepositoryInput } from '@replo/contracts'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createIdempotencyKeys } from '@/lib/idempotency-key'
import { client, orpc } from '@/lib/orpc'

export function useStartImport() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [idempotencyKeys] = useState(createIdempotencyKeys)

  return useMutation({
    mutationFn: (input: ImportRepositoryInput) =>
      client.repositories.import(input, {
        context: { idempotencyKey: idempotencyKeys.keyFor(input) },
      }),
    onSuccess: async (job) => {
      await queryClient.invalidateQueries({ queryKey: orpc.repositories.key() })
      router.push(`/jobs/${job.jobId}`)
    },
  })
}
