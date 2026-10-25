import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { SettingsPage } from '@/features/settings/settings-page'
import { isSettingsSection } from '@/features/settings/sections'

export const metadata: Metadata = { title: 'Settings' }

export default async function SettingsRoute({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params
  if (!isSettingsSection(section)) notFound()
  return <SettingsPage section={section} />
}
