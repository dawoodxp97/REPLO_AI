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
      <label htmlFor={id} className="-m-2.5 flex shrink-0 cursor-pointer items-center p-2.5">
        <Switch id={id} checked={checked} onChange={(event) => onChange(event.target.checked)} />
      </label>
    </Field>
  )
}
