export const KEY_GUIDE = { href: '/keys/', title: 'Your key' } as const

export const DOCS_INDEX = { href: '/docs/', title: 'Docs' } as const

export const DOCS_PAGES = [
  {
    href: '/docs/how-it-works/',
    title: 'How it works',
    summary: 'From a repo URL to a chaptered tutorial, step by step.',
  },
  {
    href: '/docs/grounding/',
    title: 'How grounding is checked',
    summary: 'How each explanation is tied to code, and what happens when a check fails.',
  },
  {
    href: '/docs/keys-and-privacy/',
    title: 'Keys and privacy',
    summary: 'What is stored, what is never stored or logged, and how long things are kept.',
  },
] as const

export const POLICY_PAGES = [
  { href: '/privacy/', title: 'Privacy policy' },
  { href: '/terms/', title: 'Terms of use' },
  { href: '/licence/', title: 'Licence and attribution' },
  { href: '/takedown/', title: 'Reports and takedown' },
] as const

export const SITE_PATHS = [
  '/',
  KEY_GUIDE.href,
  DOCS_INDEX.href,
  ...DOCS_PAGES.map((page) => page.href),
  ...POLICY_PAGES.map((page) => page.href),
]
