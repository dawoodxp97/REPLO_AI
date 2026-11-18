import { describe, expect, it } from 'vitest'
import { scoreCitations } from './course-references'
import { snapshotLookup } from './snapshot'
import { testContent, testSnapshot } from './test-course'

describe('scoreCitations', () => {
  it('resolves every published reference and supports every observed claim', () => {
    expect(scoreCitations(testContent(), snapshotLookup(testSnapshot))).toMatchObject({
      citationValidity: 1,
      claimSupport: 1,
      issues: [],
    })
  })

  it('rejects a blob SHA that does not match the snapshot', () => {
    const content = testContent()
    content.sourceRefs.r_a = { ...content.sourceRefs.r_a!, blobSha: '0'.repeat(40) }
    const score = scoreCitations(content, snapshotLookup(testSnapshot))
    expect(score.citationValidity).toBeLessThan(1)
    expect(score.issues[0]).toContain('blob SHA mismatch')
  })

  it('counts evidence that is not in sourceRefs as unresolved', () => {
    const content = testContent()
    content.chapters[0]!.lessons[0]!.blocks.push({
      type: 'prose',
      kind: 'interpretation',
      md: 'A claim with no published ref.',
      evidence: [{ refId: 'r_missing' }],
    })
    const score = scoreCitations(content, snapshotLookup(testSnapshot))
    expect(score.citationValidity).toBeLessThan(1)
    expect(score.issues.at(-1)).toContain('not in sourceRefs')
  })

  it('does not count an observed claim without evidence as supported', () => {
    const content = testContent()
    content.chapters[0]!.lessons[0]!.blocks.push({
      type: 'prose',
      kind: 'observed',
      md: 'An unsupported observation.',
      evidence: [],
    })
    expect(scoreCitations(content, snapshotLookup(testSnapshot)).claimSupport).toBeLessThan(1)
  })
})
