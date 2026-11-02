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
