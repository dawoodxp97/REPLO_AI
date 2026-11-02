import { useMutation } from '@tanstack/react-query'
import { orpc } from '@/lib/orpc'

export function useReportTutorial() {
  return useMutation(orpc.tutorials.report.mutationOptions())
}
