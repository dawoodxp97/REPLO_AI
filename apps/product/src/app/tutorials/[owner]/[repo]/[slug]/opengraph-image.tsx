import { notFound } from 'next/navigation'
import { ImageResponse } from 'next/og'
import { nullOnNotFound } from '@/lib/api-error'
import { serverApi } from '@/lib/server-client'
import type { TutorialRef } from '@/lib/tutorial-paths'

export const alt = 'Replo tutorial'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const PALETTE = {
  paper: '#fcfcfd',
  ink: '#1f2328',
  muted: '#6b7280',
} as const

export default async function TutorialImage({ params }: { params: Promise<TutorialRef> }) {
  const ref = await params
  const api = await serverApi()
  const overview = await nullOnNotFound(api.tutorials.get(ref))
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
        borderBottom: `8px solid ${PALETTE.ink}`,
      }}
    >
      <div style={{ display: 'flex', fontSize: 28, color: PALETTE.muted }}>
        {`${ref.owner}/${ref.repo}`}
      </div>
      <div style={{ display: 'flex', fontSize: 68, fontWeight: 600, lineHeight: 1.1 }}>
        {overview.tutorial.title}
      </div>
      <div style={{ display: 'flex', fontSize: 28, color: PALETTE.muted }}>
        Replo · a chaptered tutorial grounded in the source
      </div>
    </div>,
    size,
  )
}
