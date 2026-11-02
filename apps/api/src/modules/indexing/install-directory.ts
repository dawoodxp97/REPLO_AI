import { randomUUID } from 'node:crypto'
import { mkdir, rename, rm } from 'node:fs/promises'

const OCCUPIED = new Set(['ENOTEMPTY', 'EEXIST'])
const SWAP_ATTEMPTS = 3

const hasCode = (error: unknown, codes: ReadonlySet<string>) =>
  error instanceof Error && 'code' in error && codes.has(String(error.code))

const isOccupied = (error: unknown) => hasCode(error, OCCUPIED)

export interface InstallOptions {
  replaceOccupied?: boolean
}

async function swapIn(stagingDir: string, finalDir: string): Promise<void> {
  for (let attempt = 0; attempt < SWAP_ATTEMPTS; attempt++) {
    try {
      await rename(stagingDir, finalDir)
      return
    } catch (error) {
      if (!isOccupied(error)) throw error
    }
    const aside = `${finalDir}.${randomUUID()}.old`
    try {
      await rename(finalDir, aside)
    } catch (error) {
      if (!hasCode(error, new Set(['ENOENT']))) throw error
      continue
    }
    await rm(aside, { recursive: true, force: true })
  }
  await rename(stagingDir, finalDir)
}

export async function installDirectory<T>(
  finalDir: string,
  populate: (stagingDir: string) => Promise<T>,
  options: InstallOptions = {},
): Promise<T> {
  const stagingDir = `${finalDir}.${randomUUID()}.tmp`
  try {
    await mkdir(stagingDir, { recursive: true })
    const result = await populate(stagingDir)
    if (options.replaceOccupied) {
      await swapIn(stagingDir, finalDir)
    } else {
      try {
        await rename(stagingDir, finalDir)
      } catch (error) {
        if (!isOccupied(error)) throw error
      }
    }
    return result
  } finally {
    await rm(stagingDir, { recursive: true, force: true })
  }
}
