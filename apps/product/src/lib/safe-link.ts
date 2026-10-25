const REPO_PERMALINK = /^\/[\w.-]+\/[\w.-]+\/(blob|tree)\/[0-9a-f]{40}(\/|$)/
const ALLOWED_HOSTS = ['openrouter.ai']

export function isAllowedLink(href: string | undefined): boolean {
  if (!href) return false
  const url = parseUrl(href)
  if (url === null || url.protocol !== 'https:') return false
  if (url.hostname === 'github.com') return REPO_PERMALINK.test(url.pathname)
  return ALLOWED_HOSTS.includes(url.hostname)
}

function parseUrl(href: string): URL | null {
  try {
    return new URL(href)
  } catch {
    return null
  }
}
