export interface ContentSecurityPolicyOptions {
  nonce: string
  apiOrigin: string
  development: boolean
  upgradeInsecureRequests: boolean
}

export function buildContentSecurityPolicy({
  nonce,
  apiOrigin,
  development,
  upgradeInsecureRequests,
}: ContentSecurityPolicyOptions): string {
  const nonceSource = `'nonce-${nonce}'`
  const directives: [name: string, sources: string[]][] = [
    ['default-src', ["'self'"]],
    [
      'script-src',
      ["'self'", nonceSource, "'strict-dynamic'", ...(development ? ["'unsafe-eval'"] : [])],
    ],
    ['style-src', ["'self'", development ? "'unsafe-inline'" : nonceSource]],
    ['img-src', ["'self'", 'blob:', 'data:', 'https://avatars.githubusercontent.com']],
    ['font-src', ["'self'"]],
    ['connect-src', ["'self'", apiOrigin]],
    ['object-src', ["'none'"]],
    ['base-uri', ["'self'"]],
    ['form-action', ["'self'"]],
    ['frame-ancestors', ["'none'"]],
  ]
  if (upgradeInsecureRequests) directives.push(['upgrade-insecure-requests', []])
  return directives.map(([name, sources]) => [name, ...sources].join(' ')).join('; ')
}
