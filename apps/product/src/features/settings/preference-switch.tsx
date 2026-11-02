import { Field, FieldContent, FieldDescription, FieldLabel, Switch } from '@replo/ui'

export interface PreferenceSwitchProps {
  id: string
  label: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
}

export function PreferenceSwitch({
  id,
  label,
  description,
  checked,
  onChange,
}: PreferenceSwitchProps) {
  return (
    <Field orientation="horizontal" className="justify-between gap-6">
      <FieldContent>
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        <FieldDescription>{description}</FieldDescription>
      </FieldContent>
      <Switch id={id} checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </Field>
  )
}
