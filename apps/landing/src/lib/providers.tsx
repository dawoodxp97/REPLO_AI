import type { ReactNode } from 'react'

export function FreeModelTag() {
  return <code className="font-mono text-inline-code">:free</code>
}

export const PROVIDERS: {
  name: string
  href: string
  recommended?: boolean
  note: ReactNode
}[] = [
  {
    name: 'OpenRouter',
    href: 'https://openrouter.ai',
    recommended: true,
    note: (
      <>
        One key reaches many models, including <FreeModelTag /> models, which have limits per
        OpenRouter account.
      </>
    ),
  },
  { name: 'OpenAI', href: 'https://platform.openai.com', note: 'Works with an OpenAI API key.' },
  {
    name: 'Google AI Studio',
    href: 'https://aistudio.google.com',
    note: 'Works with a Google AI Studio key.',
  },
  {
    name: 'Anthropic',
    href: 'https://console.anthropic.com',
    note: 'Works with an Anthropic API key.',
  },
]
