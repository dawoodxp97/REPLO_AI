export interface PaletteItem {
  id: string
  label: string
  group: string
  shortcut?: readonly string[]
  run: () => void
}

export interface PaletteGroup {
  name: string
  items: PaletteItem[]
}

export function groupCommands(items: readonly PaletteItem[]): PaletteGroup[] {
  const groups: PaletteGroup[] = []
  for (const item of items) {
    const group = groups.find((candidate) => candidate.name === item.group)
    if (group) group.items.push(item)
    else groups.push({ name: item.group, items: [item] })
  }
  return groups
}
