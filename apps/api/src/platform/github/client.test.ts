import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { collectPages, createGithubRest, GithubApiError } from './client'

const Body = z.object({ id: z.number() })

function fakeFetch(responder: (url: string, init?: RequestInit) => Response) {
  const calls: { url: string; init?: RequestInit }[] = []
  const fetchImpl = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input)
    calls.push({ url, init })
    return responder(url, init)
  }) as typeof fetch
  return { fetchImpl, calls }
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

describe('createGithubRest', () => {
  it('sends the bearer token and GitHub headers', async () => {
    const { fetchImpl, calls } = fakeFetch(() => json({ id: 1 }))
    const rest = createGithubRest({ fetch: fetchImpl, origin: 'https://gh.test' })
    await rest.request('/repos/a/b', Body, { token: 'ghs_secret' })
    const headers = new Headers(calls[0]?.init?.headers)
    expect(calls[0]?.url).toBe('https://gh.test/repos/a/b')
    expect(headers.get('authorization')).toBe('Bearer ghs_secret')
    expect(headers.get('accept')).toBe('application/vnd.github+json')
  })

  it('omits the authorization header for public reads', async () => {
    const { fetchImpl, calls } = fakeFetch(() => json({ id: 1 }))
    await createGithubRest({ fetch: fetchImpl }).request('/repos/a/b', Body)
    expect(new Headers(calls[0]?.init?.headers).has('authorization')).toBe(false)
  })

  it('resolves 404 to undefined', async () => {
    const rest = createGithubRest({ fetch: fakeFetch(() => json({}, 404)).fetchImpl })
    expect(await rest.request('/repos/a/missing', Body)).toBeUndefined()
  })

  it('throws a typed error on other failures, without the response body', async () => {
    const rest = createGithubRest({ fetch: fakeFetch(() => json({ token: 'x' }, 403)).fetchImpl })
    const failure = await rest.request('/repos/a/b', Body).catch((e: unknown) => e)
    expect(failure).toBeInstanceOf(GithubApiError)
    expect((failure as GithubApiError).status).toBe(403)
    expect((failure as Error).message).not.toContain('token')
  })

  it('treats a body that does not match the schema as a bad upstream response', async () => {
    const rest = createGithubRest({ fetch: fakeFetch(() => json({ id: 'nope' })).fetchImpl })
    await expect(rest.request('/repos/a/b', Body)).rejects.toMatchObject({ status: 502 })
  })
})

describe('collectPages', () => {
  it('stops after a short page', async () => {
    const pages: number[] = []
    const items = await collectPages(async (page) => {
      pages.push(page)
      return page === 1 ? Array.from({ length: 100 }, (_, i) => i) : [1, 2]
    })
    expect(items).toHaveLength(102)
    expect(pages).toEqual([1, 2])
  })

  it('treats a missing page as empty', async () => {
    expect(await collectPages(async () => undefined)).toEqual([])
  })

  it('never reads more than the page cap', async () => {
    let reads = 0
    await collectPages(async () => {
      reads += 1
      return Array.from({ length: 100 }, () => 0)
    })
    expect(reads).toBe(20)
  })
})
