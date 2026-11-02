import { useQuery } from '@tanstack/react-query'
import { orpc } from '@/lib/orpc'

export function useInstallationRepos() {
  const repositories = useQuery(orpc.github.listRepos.queryOptions())
  const installUrl = useQuery(orpc.github.installUrl.queryOptions())

  return { repositories, installHref: installUrl.data?.url ?? null }
}
