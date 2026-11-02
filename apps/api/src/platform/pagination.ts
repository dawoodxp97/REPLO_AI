export function decodeOffset(cursor: string | undefined): number {
  return cursor === undefined ? 0 : Number(cursor)
}

export function offsetPage<Item>(
  rows: readonly Item[],
  offset: number,
  limit: number,
): { items: Item[]; nextCursor: string | null } {
  return {
    items: rows.slice(0, limit),
    nextCursor: rows.length > limit ? String(offset + limit) : null,
  }
}

export function keysetPage<Row, Item>(
  rows: readonly Row[],
  limit: number,
  toItem: (row: Row) => Item,
  cursorOf: (row: Row) => string,
): { items: Item[]; nextCursor: string | null } {
  const pageRows = rows.slice(0, limit)
  const last = pageRows.at(-1)
  return {
    items: pageRows.map(toItem),
    nextCursor: rows.length > limit && last ? cursorOf(last) : null,
  }
}
