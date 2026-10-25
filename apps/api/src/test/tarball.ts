import { gzipSync } from 'node:zlib'
import { pack, type Header } from 'tar-stream'

export interface FixtureEntry {
  name: string
  type?: Header['type']
  body?: string | Buffer
  linkname?: string
}

export async function tarballOf(entries: FixtureEntry[]): Promise<Buffer> {
  const archive = pack()
  for (const entry of entries) {
    const header: Parameters<ReturnType<typeof pack>['entry']>[0] = {
      name: entry.name,
      type: entry.type ?? 'file',
      ...(entry.linkname === undefined ? {} : { linkname: entry.linkname }),
    }
    if (entry.body === undefined) archive.entry(header)
    else archive.entry({ ...header, size: Buffer.byteLength(entry.body) }, entry.body)
  }
  archive.finalize()
  const chunks: Buffer[] = []
  for await (const chunk of archive) chunks.push(chunk as Buffer)
  return Buffer.concat(chunks)
}

export const gzippedTarballOf = async (entries: FixtureEntry[]) =>
  gzipSync(await tarballOf(entries))
