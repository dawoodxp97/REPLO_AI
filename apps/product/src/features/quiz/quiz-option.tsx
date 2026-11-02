import { cn, RadioGroupItem } from '@replo/ui'
import { Check, X } from 'lucide-react'

export type OptionOutcome = 'correct' | 'incorrect'

export interface QuizOptionProps {
  name: string
  value: string
  text: string
  checked: boolean
  disabled: boolean
  outcome: OptionOutcome | null
  onSelect: () => void
}

export function QuizOption({
  name,
  value,
  text,
  checked,
  disabled,
  outcome,
  onSelect,
}: QuizOptionProps) {
  return (
    <label
      className={cn(
        'flex min-h-11 items-center gap-3 rounded-md border bg-card px-3 py-2 text-sm transition-colors',
        disabled ? 'cursor-default' : 'cursor-pointer hover:bg-accent',
        checked && outcome === null && 'border-primary',
        outcome === 'correct' && 'border-observed/50 bg-observed/6',
        outcome === 'incorrect' && 'border-destructive/40 bg-destructive/5',
      )}
    >
      <RadioGroupItem
        name={name}
        value={value}
        checked={checked}
        disabled={disabled && outcome === null}
        onChange={() => {
          if (!disabled) onSelect()
        }}
      />
      <span className="min-w-0 flex-1">{text}</span>
      {outcome === 'correct' ? (
        <>
          <Check className="size-4 shrink-0 text-observed-text" />
          <span className="sr-only">Correct answer</span>
        </>
      ) : null}
      {outcome === 'incorrect' ? (
        <>
          <X className="size-4 shrink-0 text-destructive" />
          <span className="sr-only">Your answer</span>
        </>
      ) : null}
    </label>
  )
}
