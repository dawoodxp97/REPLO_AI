import { useQuery } from '@tanstack/react-query'
import { orpc } from '@/lib/orpc'

export function useWorkspaceSetup() {
  const me = useQuery(orpc.me.get.queryOptions())
  const keys = useQuery(orpc.keys.list.queryOptions())
  const models = useQuery(orpc.models.getPreferences.queryOptions())

  return {
    user: me.data?.user,
    githubLinked: me.data?.signInMethods.github,
    keys: keys.data,
    preset: models.data?.preset,
    defaultBudgetUsd: models.data?.defaultBudgetUsd,
  }
}

export type WorkspaceSetup = ReturnType<typeof useWorkspaceSetup>
