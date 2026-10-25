import { randomBytes } from 'node:crypto'
import { mkdtemp, readFile, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import { gzipSync } from 'node:zlib'
import { tarballOf, type FixtureEntry } from '../../test/tarball'
import { DEFAULT_EXTRACTION_LIMITS, type ExtractionLimits } from '@replo/repo-analysis'
import { describe, expect, it } from 'vitest'
import { extractArchive, type ExtractOptions } from './archive'

const compressed = async (entries: FixtureEntry[]) =>
  Readable.from([gzipSync(await tarballOf(entries))])

const optionsFor = async (
  overrides: Partial<ExtractOptions & { limits: Partial<ExtractionLimits> }> = {},
): Promise<ExtractOptions> => ({
  dir: await mkdtemp(join(tmpdir(), 'replo-archive-')),
  limits: { ...DEFAULT_EXTRACTION_LIMITS, ...overrides.limits },
  maxCompressedBytes: overrides.maxCompressedBytes ?? 1_000_000_000,
  signal: overrides.signal ?? new AbortController().signal,
})

const ROOT = 'acme-shop-abc/'

describe('extractArchive: accepted content', () => {
  it('records each file with its git blob SHA, language and role, and writes its content', async () => {
    const options = await optionsFor()
    const records = await extractArchive(
      await compressed([
        { name: `${ROOT}`, type: 'directory' },
        { name: `${ROOT}src/`, type: 'directory' },
        { name: `${ROOT}src/hello.ts`, body: 'hello\n' },
      ]),
      options,
    )
    expect(records).toEqual([
      {
        path: 'src/hello.ts',
        blobSha: 'ce013625030ba8dba906f756967f9e9ca394464a',
        sizeBytes: 6,
        language: 'typescript',
        role: 'source',
      },
    ])
    expect(await readFile(join(options.dir, 'src/hello.ts'), 'utf8')).toBe('hello\n')
  })

  it('skips excluded directories and env files', async () => {
    const records = await extractArchive(
      await compressed([
        { name: `${ROOT}node_modules/left-pad/index.js`, body: 'x' },
        { name: `${ROOT}.env.local`, body: 'SECRET=1' },
        { name: `${ROOT}src/keep.ts`, body: 'y' },
      ]),
      await optionsFor(),
    )
    expect(records.map((r) => r.path)).toEqual(['src/keep.ts'])
  })

  it('records a binary as metadata only, with no content on disk', async () => {
    const options = await optionsFor()
    const records = await extractArchive(
      await compressed([
        { name: `${ROOT}public/logo.png`, body: Buffer.from([0x89, 0x50, 0, 0x47]) },
      ]),
      options,
    )
    expect(records).toMatchObject([{ path: 'public/logo.png', role: 'asset' }])
    await expect(stat(join(options.dir, 'public/logo.png'))).rejects.toMatchObject({
      code: 'ENOENT',
    })
  })

  it('records a file above the 1 MB index limit without its content', async () => {
    const options = await optionsFor()
    const big = randomBytes(500_001).toString('hex').slice(0, 1_000_001)
    const records = await extractArchive(
      await compressed([{ name: `${ROOT}src/big.ts`, body: big }]),
      options,
    )
    expect(records).toMatchObject([{ path: 'src/big.ts', sizeBytes: 1_000_001 }])
  })

  it('drops a Git LFS pointer instead of indexing it', async () => {
    const pointer = 'version https://git-lfs.github.com/spec/v1\noid sha256:abc\nsize 9\n'
    const records = await extractArchive(
      await compressed([{ name: `${ROOT}assets/model.ts`, body: pointer }]),
      await optionsFor(),
    )
    expect(records).toEqual([])
  })

  it('keeps the last entry when a path appears twice', async () => {
    const records = await extractArchive(
      await compressed([
        { name: `${ROOT}src/a.ts`, body: 'first' },
        { name: `${ROOT}src/a.ts`, body: 'second!' },
      ]),
      await optionsFor(),
    )
    expect(records).toMatchObject([{ path: 'src/a.ts', sizeBytes: 7 }])
  })
})

describe('extractArchive: rejected archives', () => {
  const rejects = (entries: FixtureEntry[], overrides = {}) =>
    compressed(entries).then((input) =>
      optionsFor(overrides).then((options) => extractArchive(input, options)),
    )

  it('rejects a path that escapes the root (zip-slip)', async () => {
    await expect(rejects([{ name: `${ROOT}../../escape.txt`, body: 'x' }])).rejects.toMatchObject({
      code: 'UNSAFE_ARCHIVE',
      retryable: false,
    })
  })

  it('rejects an absolute path', async () => {
    await expect(rejects([{ name: '/etc/passwd', body: 'x' }])).rejects.toMatchObject({
      code: 'UNSAFE_ARCHIVE',
    })
  })

  it('rejects a symlink entry', async () => {
    await expect(
      rejects([{ name: `${ROOT}link`, type: 'symlink', linkname: '/etc/passwd' }]),
    ).rejects.toMatchObject({ code: 'UNSAFE_ARCHIVE' })
  })

  it('rejects a hardlink entry', async () => {
    await expect(
      rejects([{ name: `${ROOT}hard`, type: 'link', linkname: `${ROOT}src/a.ts` }]),
    ).rejects.toMatchObject({ code: 'UNSAFE_ARCHIVE' })
  })

  it('rejects a device entry', async () => {
    await expect(rejects([{ name: `${ROOT}tty`, type: 'character-device' }])).rejects.toMatchObject(
      { code: 'UNSAFE_ARCHIVE' },
    )
  })

  it('rejects an archive whose total uncompressed size exceeds the cap', async () => {
    await expect(
      rejects([{ name: `${ROOT}a.ts`, body: 'x'.repeat(100) }], { limits: { maxTotalBytes: 50 } }),
    ).rejects.toMatchObject({ code: 'UNSAFE_ARCHIVE', message: 'ARCHIVE_TOO_LARGE' })
  })

  it('rejects an entry above the per-file cap', async () => {
    await expect(
      rejects([{ name: `${ROOT}a.ts`, body: 'x'.repeat(100) }], { limits: { maxEntryBytes: 50 } }),
    ).rejects.toMatchObject({ code: 'UNSAFE_ARCHIVE' })
  })

  it('rejects a highly compressible archive (bomb ratio)', async () => {
    const bomb = Buffer.alloc(5_000_000, 0)
    const input = Readable.from([
      gzipSync(await tarballOf([{ name: `${ROOT}zeros.ts`, body: bomb }])),
    ])
    await expect(extractArchive(input, await optionsFor())).rejects.toMatchObject({
      code: 'UNSAFE_ARCHIVE',
    })
  })

  it('rejects an archive whose download exceeds the byte cap', async () => {
    await expect(
      rejects([{ name: `${ROOT}a.ts`, body: 'x' }], { maxCompressedBytes: 10 }),
    ).rejects.toMatchObject({ code: 'REPO_TOO_LARGE' })
  })
})
