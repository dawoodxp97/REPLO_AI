export function fieldInvalid(error: string | undefined): { 'aria-invalid'?: true } {
  return error ? { 'aria-invalid': true } : {}
}
