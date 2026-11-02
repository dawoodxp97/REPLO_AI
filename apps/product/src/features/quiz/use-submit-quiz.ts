import { useMutation } from '@tanstack/react-query'
import { orpc } from '@/lib/orpc'

export function useSubmitQuiz() {
  return useMutation(orpc.learning.submitQuiz.mutationOptions())
}
