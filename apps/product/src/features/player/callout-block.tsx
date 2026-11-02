import { Alert, AlertDescription, AlertTitle } from '@replo/ui'
import { Info, Lightbulb, TriangleAlert } from 'lucide-react'
import { SafeMarkdown } from '@/components/safe-markdown'

const CALLOUTS = {
  note: { title: 'Note', variant: 'default', Icon: Info },
  warning: { title: 'Warning', variant: 'interpretation', Icon: TriangleAlert },
  tip: { title: 'Tip', variant: 'default', Icon: Lightbulb },
} as const

export function CalloutBlock({ tone, md }: { tone: keyof typeof CALLOUTS; md: string }) {
  const { title, variant, Icon } = CALLOUTS[tone]
  return (
    <Alert variant={variant}>
      <Icon />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="text-foreground">
        <SafeMarkdown source={md} />
      </AlertDescription>
    </Alert>
  )
}
