import { RepoLimitData } from '@replo/contracts'
import { KEY_ERROR_COPY } from '@/features/keys'
import { formatBytes, formatCount } from '@/lib/format'
import { createErrorDescriber, type DataDescriber, type ErrorCopy } from '@/lib/error-copy'

const IMPORT_ERROR_COPY = {
  REPO_NOT_ACCESSIBLE:
    'We could not read this repository. For private repos, install the GitHub App and select it.',
  UNSUPPORTED_LANGUAGE:
    'This repository has no readable text files to turn into a course. Check that it is not empty or binary-only.',
  MODEL_NOT_ALLOWED: 'That model is not verified for this product. Pick another one.',
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

export const describeImportError = createErrorDescriber(IMPORT_ERROR_COPY, {
  REPO_TOO_LARGE: describeRepositoryLimit,
})
