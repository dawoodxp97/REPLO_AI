import { apiErrorDetails } from './api-error'

export const GENERIC_ERROR = 'Something went wrong. Try again.'

export type ErrorCopy = Readonly<Record<string, string>>
export type DataDescriber = (data: unknown) => string | null

export function createErrorDescriber(
  copy: ErrorCopy,
  describeData: Readonly<Record<string, DataDescriber>> = {},
): (error: unknown) => string {
  return (error) => {
    const details = apiErrorDetails(error)
    if (!details) return GENERIC_ERROR
    const describe = describeData[details.code]
    if (describe) return describe(details.data) ?? GENERIC_ERROR
    return copy[details.code] ?? GENERIC_ERROR
  }
}
