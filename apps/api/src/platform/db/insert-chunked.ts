const MAX_BIND_PARAMETERS = 65_000
const MAX_ROWS_PER_INSERT = 5_000

export async function insertChunked<T>(
  rows: readonly T[],
  columnCount: number,
  insert: (chunk: T[]) => PromiseLike<unknown>,
): Promise<void> {
  const chunkSize = Math.min(MAX_ROWS_PER_INSERT, Math.floor(MAX_BIND_PARAMETERS / columnCount))
  for (let offset = 0; offset < rows.length; offset += chunkSize)
    await insert(rows.slice(offset, offset + chunkSize))
}
