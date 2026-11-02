import { BudgetBelowEstimate, PresetUnavailable, RepoLimitData } from '@replo/contracts'
import { KEY_ERROR_COPY } from '@/features/keys'
import { formatBytes, formatCount, formatUsd } from '@/lib/format'
import { createErrorDescriber, type DataDescriber, type ErrorCopy } from '@/lib/error-copy'

const IMPORT_ERROR_COPY = {
  REPO_NOT_ACCESSIBLE:
    'We could not read this repository. For private repos, install the GitHub App and select it.',
  UNSUPPORTED_LANGUAGE:
    'This repository has no readable text files to turn into a tutorial. Check that it is not empty or binary-only.',
  FREE_PRESET_REQUIRES_OPENROUTER:
    'The Free preset uses OpenRouter :free models. Pick an OpenRouter key, or choose another preset.',
  CUSTOM_MODEL_NOT_ALLOWED:
    'One of your custom models is not allowed. Check it in Settings → Models.',
  KEY_INVALID: KEY_ERROR_COPY.KEY_INVALID,
  KEY_CHECK_UNAVAILABLE: KEY_ERROR_COPY.KEY_CHECK_UNAVAILABLE,
} as const satisfies ErrorCopy

const describeRepositoryLimit: DataDescriber = (data) => {
  const limit = RepoLimitData.safeParse(data)
  if (!limit.success) return null
  const cap =
    limit.data.metric === 'files'
      ? `${formatCount(limit.data.limit)} files`
      : formatBytes(limit.data.limit)
  return `This repository is over the ${cap} limit. Importing a sub-directory is not available yet.`
}

const describeBudgetShortfall: DataDescriber = (data) => {
  const shortfall = BudgetBelowEstimate.safeParse(data)
  if (!shortfall.success) return null
  return `The estimate is ${formatUsd(shortfall.data.estimateUsd)}, above your ${formatUsd(shortfall.data.budgetUsd)} ceiling. Raise the ceiling or choose a cheaper preset.`
}

const describePresetUnavailable: DataDescriber = (data) => {
  const unavailable = PresetUnavailable.safeParse(data)
  return unavailable.success ? unavailable.data.reason : null
}

export const describeImportError = createErrorDescriber(IMPORT_ERROR_COPY, {
  REPO_TOO_LARGE: describeRepositoryLimit,
  BUDGET_BELOW_ESTIMATE: describeBudgetShortfall,
  PRESET_UNAVAILABLE: describePresetUnavailable,
})
