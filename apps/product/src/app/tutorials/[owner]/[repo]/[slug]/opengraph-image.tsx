import { ImageResponse } from 'next/og'
import { notFound } from 'next/navigation'
import { isApiErrorCode } from '@/lib/api-error'
import { serverApi } from '@/lib/server-client'

export const alt = 'Replo tutorial'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const PALETTE = {
  paper: '#faf8f3',
  ink: '#1f2433',
  muted: '#5b6175',
  accent: '#2f4fa3',
} as const

export default async function TutorialImage({
  params,
}: {
  params: Promise<{ owner: string; repo: string; slug: string }>
}) {
  const ref = await params
  const api = await serverApi()
  const overview = await api.tutorials.get(ref).catch((error: unknown) => {
    if (isApiErrorCode(error, 'NOT_FOUND')) return null
    throw error
  })
  if (!overview || overview.tutorial.visibility !== 'public') notFound()

  return new ImageResponse(
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        width: '100%',
        height: '100%',
        padding: 72,
        background: PALETTE.paper,
        color: PALETTE.ink,
      }}
    >
      <div style={{ display: 'flex', fontSize: 28, color: PALETTE.muted }}>
        {`${ref.owner}/${ref.repo}`}
      </div>
      <div style={{ display: 'flex', fontSize: 68, fontWeight: 600, lineHeight: 1.1 }}>
        {overview.tutorial.title}
      </div>
      <div style={{ display: 'flex', fontSize: 30, color: PALETTE.accent }}>
        Replo · grounded, chaptered tutorial
      </div>
    </div>,
    size,
  )
}
