import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve, sep } from 'node:path'
import { Transform, type Readable } from 'node:stream'
import { createGunzip } from 'node:zlib'
import {
  ExtractionGuard,
  looksBinary,
  type ArchiveEntryType,
  type ExtractionLimits,
  type FileRole,
  type Language,
} from '@replo/repo-analysis'
import { extract, type Extract, type Header } from 'tar-stream'
import { JobError } from '../../jobs/errors'
import { decideFile, isLfsPointer } from './file-policy'

export interface ArchiveRecord {
  path: string
  blobSha: string
  sizeBytes: number
  language: Language | null
  role: FileRole
}

export interface ExtractOptions {
  dir: string
  limits: ExtractionLimits
  maxCompressedBytes: number
  signal: AbortSignal
}

type Entry = Extract extends AsyncIterable<infer Source> ? Source : never

const ENTRY_TYPES: Record<string, ArchiveEntryType> = {
  file: 'file',
  'contiguous-file': 'file',
  directory: 'directory',
  symlink: 'symlink',
  link: 'hardlink',
  'character-device': 'device',
  'block-device': 'device',
}

const entryType = (type: Header['type']): ArchiveEntryType => ENTRY_TYPES[type] ?? 'other'

export async function extractArchive(
  compressed: Readable,
  options: ExtractOptions,
): Promise<ArchiveRecord[]> {
  const guard = new ExtractionGuard(options.limits)
  const tar = extract()
  let compressedBytes = 0
  const meter = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      compressedBytes += chunk.length
      if (compressedBytes > options.maxCompressedBytes)
        callback(new JobError('REPO_TOO_LARGE', false, 'archive exceeds the download cap'))
      else callback(null, chunk)
    },
  })

  const gunzip = createGunzip()
  const streams = [compressed, meter, gunzip, tar]
  const abort = (reason: unknown) => {
    for (const stream of streams) stream.destroy(reason instanceof Error ? reason : undefined)
  }
  options.signal.addEventListener('abort', () => abort(options.signal.reason), { once: true })
  for (const stream of streams) stream.on('error', abort)

  const records = new Map<string, ArchiveRecord>()
  compressed.pipe(meter).pipe(gunzip).pipe(tar)
  try {
    for await (const entry of tar) {
      const record = await acceptEntry(entry, guard, options.dir, compressedBytes)
      if (record) records.set(record.path, record)
    }
  } catch (err) {
    abort(err)
    throw err
  }
  return [...records.values()]
}

async function acceptEntry(
  entry: Entry,
  guard: ExtractionGuard,
  dir: string,
  compressedSoFar: number,
): Promise<ArchiveRecord | undefined> {
  const size = entry.header.size
  const verdict = guard.check(
    { path: entry.header.name, type: entryType(entry.header.type), size },
    compressedSoFar,
  )
  if (!verdict.ok) {
    entry.resume()
    throw new JobError('UNSAFE_ARCHIVE', false, verdict.reason)
  }
  if (verdict.path === null) {
    entry.resume()
    return undefined
  }

  const path = verdict.path
  const decision = decideFile(path, size)
  if (decision.kind === 'skip') {
    entry.resume()
    return undefined
  }

  const hash = createHash('sha1').update(`blob ${size}\0`)
  const chunks: Buffer[] = []
  for await (const chunk of entry) {
    if (!Buffer.isBuffer(chunk)) throw new Error('archive entry chunk is not a Buffer')
    hash.update(chunk)
    if (decision.keepContent) chunks.push(chunk)
  }

  const content = decision.keepContent ? Buffer.concat(chunks) : undefined
  if (content && isLfsPointer(content)) return undefined
  if (content !== undefined && !looksBinary(content)) await writeContent(dir, path, content)

  return {
    path,
    blobSha: hash.digest('hex'),
    sizeBytes: size,
    language: decision.language === 'other' ? null : decision.language,
    role: decision.role,
  }
}

async function writeContent(dir: string, path: string, content: Buffer): Promise<void> {
  const root = resolve(dir)
  const target = resolve(root, path)
  if (!target.startsWith(root + sep)) throw new JobError('UNSAFE_ARCHIVE', false, 'PATH_ESCAPE')
  await mkdir(dirname(target), { recursive: true })
  await writeFile(target, content)
}
