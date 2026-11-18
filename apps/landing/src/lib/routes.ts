export const KEY_GUIDE = {
  href: '/keys/',
  title: 'Your key',
  summary: 'Choosing a provider, OpenRouter’s :free limits and how keys are handled.',
} as const

export const DOCS_INDEX = { href: '/docs/', title: 'Docs' } as const

export const HOME_ANCHORS = {
  graph: { href: '/#graph', title: 'Graph' },
  diagrams: { href: '/#diagrams', title: 'Diagrams' },
  how: { href: '/#how', title: 'How it works' },
  checks: { href: '/#checks', title: 'Checks' },
  faq: { href: '/#faq', title: 'FAQ' },
} as const

export const HOW_IT_WORKS_PAGE = {
  href: '/docs/how-it-works/',
  title: 'How it works',
  summary: 'The ten stages from a repository URL to a published course.',
} as const

export const GROUNDING_PAGE = {
  href: '/docs/grounding/',
  title: 'How grounding is checked',
  summary: 'How each claim and diagram edge is tied to code, and what happens when a check fails.',
} as const

export const KEYS_AND_PRIVACY_PAGE = {
  href: '/docs/keys-and-privacy/',
  title: 'Keys and privacy',
  summary: 'What is stored, what is never stored or logged, and how long things are kept.',
} as const

export const DOCS_PAGES = [HOW_IT_WORKS_PAGE, GROUNDING_PAGE, KEYS_AND_PRIVACY_PAGE] as const

export const GUIDES = [...DOCS_PAGES, KEY_GUIDE] as const

export const PRIVACY_PAGE = { href: '/privacy/', title: 'Privacy policy' } as const

export const TERMS_PAGE = { href: '/terms/', title: 'Terms of use' } as const

export const LICENCE_PAGE = { href: '/licence/', title: 'Licence and attribution' } as const

export const POLICY_PAGES = [PRIVACY_PAGE, TERMS_PAGE, LICENCE_PAGE] as const

export const SITE_PATHS = [
  '/',
  KEY_GUIDE.href,
  DOCS_INDEX.href,
  ...DOCS_PAGES.map((page) => page.href),
  ...POLICY_PAGES.map((page) => page.href),
]
