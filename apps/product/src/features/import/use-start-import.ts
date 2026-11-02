import type { ImportRepositoryInput } from '@replo/contracts'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { invalidateGenerationQueries } from '@/features/jobs/invalidate-generation-queries'
import { createIdempotencyKeys } from '@/lib/idempotency-key'
import { client } from '@/lib/orpc'

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
      await invalidateGenerationQueries(queryClient)
      router.push(`/jobs/${job.jobId}`)
    },
  })
}
