export const FIRST_PAGE: string | undefined = undefined

export function nextCursorOf(page: { nextCursor?: string | null }): string | undefined {
  return page.nextCursor ?? undefined
}

export function pageItems<T>(data: { pages: readonly { items: readonly T[] }[] } | undefined): T[] {
  return data?.pages.flatMap((page) => page.items) ?? []
}
