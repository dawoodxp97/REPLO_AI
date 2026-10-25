import type { z } from 'zod'

const API_ORIGIN = 'https://api.github.com'
const PER_PAGE = 100
const MAX_PAGES = 20

export class GithubApiError extends Error {
  constructor(
    readonly status: number,
    readonly path: string,
  ) {
    super(`GitHub API responded ${status} for ${path}`)
    this.name = 'GithubApiError'
  }
}

function unwrapResponse(response: Response, path: string): Response | undefined {
  if (response.status === 404) return undefined
  if (!response.ok) throw new GithubApiError(response.status, path)
  return response
}

export interface GithubRequestOptions {
  token?: string
  method?: 'GET' | 'POST'
}

export interface GithubDownloadOptions {
  token?: string
  signal?: AbortSignal
}

export interface GithubRest {
  request<S extends z.ZodType>(
    path: string,
    schema: S,
    options?: GithubRequestOptions,
  ): Promise<z.output<S> | undefined>
  download(path: string, options?: GithubDownloadOptions): Promise<Response | undefined>
}

export interface GithubRestDeps {
  fetch?: typeof fetch
  origin?: string
}

export function createGithubRest(deps: GithubRestDeps = {}): GithubRest {
  const fetchImpl = deps.fetch ?? fetch
  const origin = deps.origin ?? API_ORIGIN
  const send = (
    path: string,
    { method, token, signal }: { method: 'GET' | 'POST'; token?: string; signal?: AbortSignal },
  ) =>
    fetchImpl(`${origin}${path}`, {
      method,
      redirect: 'follow',
      signal,
      headers: {
        accept: 'application/vnd.github+json',
        'x-github-api-version': '2022-11-28',
        'user-agent': 'replo-api',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
    })

  return {
    async request(path, schema, { token, method = 'GET' } = {}) {
      const response = unwrapResponse(await send(path, { method, token }), path)
      if (!response) return undefined
      const parsed = schema.safeParse(await response.json())
      if (!parsed.success) throw new GithubApiError(502, path)
      return parsed.data
    },

    async download(path, { token, signal } = {}) {
      return unwrapResponse(await send(path, { method: 'GET', token, signal }), path)
    },
  }
}

export const pageQuery = (page: number) => `per_page=${PER_PAGE}&page=${page}`

export async function collectPages<T>(
  fetchPage: (page: number) => Promise<readonly T[] | undefined>,
): Promise<T[]> {
  const items: T[] = []
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const batch = (await fetchPage(page)) ?? []
    items.push(...batch)
    if (batch.length < PER_PAGE) break
  }
  return items
}
