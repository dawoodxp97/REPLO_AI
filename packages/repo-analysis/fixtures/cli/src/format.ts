export function format(input: string | undefined): string {
  return (input ?? '').trim().toLowerCase()
}
