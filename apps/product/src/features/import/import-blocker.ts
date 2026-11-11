import { ImportRepositoryInput } from '@replo/contracts'

const FIELD_STEPS: Readonly<Record<string, string>> = {
  source: 'Add the repository to teach first.',
  keyId: 'Choose the key that pays for the run.',
  audience: 'Choose who the tutorial is for.',
  preset: 'Choose a model preset.',
  customModels: 'Pick a model for every role.',
  budgetUsd: 'Fix the budget ceiling.',
}

export function importBlocker(values: unknown): string | null {
  const parsed = ImportRepositoryInput.safeParse(values)
  if (parsed.success) return null
  const field = parsed.error.issues[0]?.path[0]
  const step = typeof field === 'string' && Object.hasOwn(FIELD_STEPS, field) ? FIELD_STEPS[field] : undefined
  return step ?? 'Complete the form to start.'
}
