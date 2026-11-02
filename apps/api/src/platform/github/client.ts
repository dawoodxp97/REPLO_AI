import type { z } from 'zod'

export const GITHUB_API_ORIGIN = 'https://api.github.com'
const PER_PAGE = 100
const MAX_PAGES = 20
const REQUEST_TIMEOUT_MS = 30_000
const DOWNLOAD_TIMEOUT_MS = 300_000
const RETRYABLE_STATUSES = new Set([502, 503])

export const repoApiPath = (owner: string, name: string) =>
  `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`

export class GithubApiError extends Error {
  constructor(
    readonly status: number,
    readonly path: string,
  ) {
    super(`GitHub API responded ${status} for ${path}`)
    this.name = 'GithubApiError'
  }
}

export class GithubRateLimitedError extends GithubApiError {
  constructor(
    status: number,
    path: string,
    readonly retryAfterSeconds: number | null,
  ) {
    super(status, path)
    this.name = 'GithubRateLimitedError'
  }
}

export class GithubTokenRejectedError extends Error {
  constructor() {
    super('GitHub rejected the stored user token')
    this.name = 'GithubTokenRejectedError'
  }
}

export type GithubFailure = 'token_rejected' | 'forbidden' | 'other'

export function classifyGithubFailure(error: unknown): GithubFailure {
  if (error instanceof GithubTokenRejectedError) return 'token_rejected'
  if (error instanceof GithubApiError) {
    if (error.status === 401) return 'token_rejected'
    if (error.status === 403) return 'forbidden'
  }
  return 'other'
}

function isRateLimited(response: Response): boolean {
  if (response.status === 429) return true
  return (
    response.status === 403 &&
    (response.headers.get('x-ratelimit-remaining') === '0' || response.headers.has('retry-after'))
  )
}

function unwrapResponse(response: Response, path: string): Response | undefined {
  if (response.status === 404) return undefined
  if (isRateLimited(response)) {
    const retryAfter = Number(response.headers.get('retry-after'))
    throw new GithubRateLimitedError(
      response.status,
      path,
      Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : null,
    )
  }
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
  const origin = deps.origin ?? GITHUB_API_ORIGIN
  const send = async (
    path: string,
    {
      method,
      token,
      signal,
      timeoutMs,
    }: { method: 'GET' | 'POST'; token?: string; signal?: AbortSignal; timeoutMs: number },
  ) => {
    const deadline = AbortSignal.timeout(timeoutMs)
    const combined = signal ? AbortSignal.any([signal, deadline]) : deadline
    const attempts = method === 'GET' ? 2 : 1
    let response: Response | undefined
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      response = await fetchImpl(`${origin}${path}`, {
        method,
        redirect: 'follow',
        signal: combined,
        headers: {
          accept: 'application/vnd.github+json',
          'x-github-api-version': '2022-11-28',
          'user-agent': 'replo-api',
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
      })
      if (!RETRYABLE_STATUSES.has(response.status)) break
    }
    return response as Response
  }

  return {
    async request(path, schema, { token, method = 'GET' } = {}) {
      const response = unwrapResponse(await send(path, { method, token, timeoutMs: REQUEST_TIMEOUT_MS }), path)
      if (!response) return undefined
      const parsed = schema.safeParse(await response.json())
      if (!parsed.success) throw new GithubApiError(502, path)
      return parsed.data
    },

    async download(path, { token, signal } = {}) {
      return unwrapResponse(
        await send(path, { method: 'GET', token, signal, timeoutMs: DOWNLOAD_TIMEOUT_MS }),
        path,
      )
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
