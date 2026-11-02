import { z } from 'zod'

const CursorPosition = z.object({
  at: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/),
  id: z.uuid(),
})

export type CursorPosition = z.infer<typeof CursorPosition>

export const encodeCursor = (position: CursorPosition): string =>
  Buffer.from(JSON.stringify(position)).toString('base64url')

export function decodeCursor(cursor: string): CursorPosition | undefined {
  try {
    const parsed = CursorPosition.safeParse(
      JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')),
    )
    return parsed.success ? parsed.data : undefined
  } catch {
    return undefined
  }
}
