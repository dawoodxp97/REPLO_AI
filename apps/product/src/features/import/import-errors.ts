import { BudgetBelowEstimate, PresetUnavailable, RepoLimitData } from '@replo/contracts'
import { apiErrorDetails } from '@/lib/api-error'
import { formatBytes, formatCount, formatUsd } from '@/lib/format'

const GENERIC_ERROR = 'Something went wrong. Try again.'

const IMPORT_ERROR_COPY: Record<string, string> = {
  REPO_NOT_ACCESSIBLE:
    'We could not read this repository. For private repos, install the GitHub App and select it.',
  UNSUPPORTED_LANGUAGE: 'Release 1 supports TypeScript and JavaScript repositories only.',
  FREE_PRESET_REQUIRES_OPENROUTER:
    'The Free preset uses OpenRouter :free models. Pick an OpenRouter key, or choose another preset.',
  CUSTOM_MODEL_NOT_ALLOWED:
    'One of your custom models is not allowed. Check it in Settings → Models.',
  KEY_INVALID: 'That API key was rejected by the provider. Check it in Settings → API keys.',
  KEY_CHECK_UNAVAILABLE: 'The provider did not answer the key check. Try again in a few minutes.',
}

export function describeImportError(error: unknown): string {
  const details = apiErrorDetails(error)
  if (!details) return GENERIC_ERROR

  switch (details.code) {
    case 'REPO_TOO_LARGE':
      return describeRepositoryLimit(details.data)
    case 'BUDGET_BELOW_ESTIMATE':
      return describeBudgetShortfall(details.data)
    case 'PRESET_UNAVAILABLE':
      return describePresetUnavailable(details.data)
    default:
      return IMPORT_ERROR_COPY[details.code] ?? GENERIC_ERROR
  }
}

function describeRepositoryLimit(data: unknown): string {
  const limit = RepoLimitData.safeParse(data)
  if (!limit.success) return GENERIC_ERROR
  const cap =
    limit.data.metric === 'files'
      ? `${formatCount(limit.data.limit)} files`
      : formatBytes(limit.data.limit)
  return `This repository is over the ${cap} limit. Importing a sub-directory is not available yet.`
}

function describeBudgetShortfall(data: unknown): string {
  const shortfall = BudgetBelowEstimate.safeParse(data)
  if (!shortfall.success) return GENERIC_ERROR
  return `The estimate is ${formatUsd(shortfall.data.estimateUsd)}, above your ${formatUsd(shortfall.data.budgetUsd)} ceiling. Raise the ceiling or choose a cheaper preset.`
}

function describePresetUnavailable(data: unknown): string {
  const unavailable = PresetUnavailable.safeParse(data)
  return unavailable.success ? unavailable.data.reason : GENERIC_ERROR
}
