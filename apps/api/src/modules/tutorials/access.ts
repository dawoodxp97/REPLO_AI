import { randomBytes, timingSafeEqual } from 'node:crypto'
import type { Visibility } from '@replo/contracts'
import type { TutorialRow } from './tutorials.repo'

export interface Viewer {
  userId?: string | undefined
  shareToken?: string | undefined
}

interface Ownership {
  ownerId: string | null
  visibility: Visibility
  shareToken: string | null
}

export function canRead(tutorial: Ownership, viewer: Viewer): boolean {
  if (tutorial.visibility === 'public') return true
  if (viewer.userId !== undefined && tutorial.ownerId === viewer.userId) return true
  return (
    tutorial.visibility === 'link' &&
    viewer.shareToken !== undefined &&
    tutorial.shareToken !== null &&
    sameToken(viewer.shareToken, tutorial.shareToken)
  )
}

export function ownershipOf(tutorial: TutorialRow): Ownership {
  return {
    ownerId: tutorial.userId,
    visibility: tutorial.visibility,
    shareToken: tutorial.shareToken,
  }
}

export function isOwner(tutorial: Pick<Ownership, 'ownerId'>, userId: string): boolean {
  return tutorial.ownerId === userId
}

export function newShareToken(): string {
  return randomBytes(24).toString('base64url')
}

export function tutorialPath(owner: string, repo: string, slug: string): string {
  return `/tutorials/${owner}/${repo}/${slug}`
}

function sameToken(given: string, expected: string): boolean {
  const a = Buffer.from(given)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}
