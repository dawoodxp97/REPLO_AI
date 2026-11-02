export const cursorPaging = {
  initialPageParam: undefined as string | undefined,
  getNextPageParam: (page: { nextCursor?: string | null }): string | undefined =>
    page.nextCursor ?? undefined,
}

export function pageItems<T>(data: { pages: readonly { items: readonly T[] }[] } | undefined): T[] {
  return data?.pages.flatMap((page) => page.items) ?? []
}
