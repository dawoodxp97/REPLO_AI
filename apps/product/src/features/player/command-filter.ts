export function filterCommands<T extends { label: string }>(
  commands: readonly T[],
  query: string,
): T[] {
  const needle = query.trim().toLowerCase()
  if (needle === '') return [...commands]
  return commands.filter((command) => command.label.toLowerCase().includes(needle))
}
