import { Alert, AlertDescription, AlertTitle } from '@replo/ui'
import { CircleAlert, CircleCheck, TriangleAlert } from 'lucide-react'
import { githubSetupMessage, type GithubSetupTone } from './github-setup-status'

const TONE_ICONS = {
  observed: CircleCheck,
  interpretation: TriangleAlert,
  destructive: CircleAlert,
} as const satisfies Record<GithubSetupTone, typeof CircleAlert>

export function GithubSetupNotice({ status }: { status: string | undefined }) {
  const message = githubSetupMessage(status)
  if (!message) return null
  const Icon = TONE_ICONS[message.tone]

  return (
    <Alert variant={message.tone} role={message.tone === 'destructive' ? 'alert' : 'status'}>
      <Icon />
      <AlertTitle>{message.title}</AlertTitle>
      <AlertDescription>{message.description}</AlertDescription>
    </Alert>
  )
}
