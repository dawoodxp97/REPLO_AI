import type { MetadataRoute } from 'next'
import { SITE_PATHS } from '@/lib/routes'

export const dynamic = 'force-static'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export default function sitemap(): MetadataRoute.Sitemap {
  return SITE_PATHS.map((path) => ({ url: `${siteUrl}${path}`, lastModified: new Date() }))
}
