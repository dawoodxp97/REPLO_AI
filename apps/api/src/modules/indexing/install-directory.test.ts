import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { installDirectory } from './install-directory'

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

describe('installDirectory', () => {
  let root: string

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'replo-install-'))
  })

  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })

  const populateWith =
    (files: Record<string, string>, delayMs = 0) =>
    async (dir: string) => {
      for (const [name, text] of Object.entries(files)) {
        await writeFile(join(dir, name), text)
        await pause(delayMs)
      }
      return Object.keys(files)
    }

  it('publishes the populated directory and returns the populate result', async () => {
    const target = join(root, 'snap')
    const result = await installDirectory(target, populateWith({ 'a.txt': 'one' }))
    expect(result).toEqual(['a.txt'])
    expect(await readFile(join(target, 'a.txt'), 'utf8')).toBe('one')
    expect(await readdir(root)).toEqual(['snap'])
  })

  it('keeps the shared directory complete while two writers race on it', async () => {
    const target = join(root, 'snap')
    const files = { 'a.txt': 'one', 'b.txt': 'two', 'c.txt': 'three' }
    const first = installDirectory(target, populateWith(files, 15))
    await pause(10)
    const second = installDirectory(target, populateWith(files, 5))
    await Promise.all([first, second])
    expect((await readdir(target)).sort()).toEqual(['a.txt', 'b.txt', 'c.txt'])
    expect(await readdir(root)).toEqual(['snap'])
  })

  it('never exposes a partial directory to readers before the swap', async () => {
    const target = join(root, 'snap')
    let seenDuringPopulate: string[] | undefined
    const install = installDirectory(target, async (dir) => {
      await writeFile(join(dir, 'a.txt'), 'one')
      seenDuringPopulate = await readdir(root).then((entries) =>
        entries.filter((entry) => entry === 'snap'),
      )
      await pause(5)
    })
    await install
    expect(seenDuringPopulate).toEqual([])
  })

  it('leaves nothing behind when populate fails', async () => {
    const target = join(root, 'snap')
    await expect(
      installDirectory(target, async (dir) => {
        await writeFile(join(dir, 'a.txt'), 'one')
        throw new Error('extract failed')
      }),
    ).rejects.toThrow('extract failed')
    expect(await readdir(root)).toEqual([])
  })

  it('does not disturb a directory another job already installed', async () => {
    const target = join(root, 'snap')
    await installDirectory(target, populateWith({ 'a.txt': 'first' }))
    await installDirectory(target, populateWith({ 'a.txt': 'second' }))
    expect(await readFile(join(target, 'a.txt'), 'utf8')).toBe('first')
    expect(await readdir(root)).toEqual(['snap'])
  })

  it('replaces an occupied directory when asked to', async () => {
    const target = join(root, 'snap')
    await mkdir(target)
    await writeFile(join(target, 'stale.txt'), 'partial')
    await installDirectory(target, populateWith({ 'a.txt': 'fresh' }), { replaceOccupied: true })
    expect(await readdir(target)).toEqual(['a.txt'])
    expect(await readFile(join(target, 'a.txt'), 'utf8')).toBe('fresh')
    expect(await readdir(root)).toEqual(['snap'])
  })

  it('installs into a free path when replacing is allowed', async () => {
    const target = join(root, 'snap')
    await installDirectory(target, populateWith({ 'a.txt': 'one' }), { replaceOccupied: true })
    expect(await readFile(join(target, 'a.txt'), 'utf8')).toBe('one')
  })

  it('leaves the old directory in place when populate fails while replacing', async () => {
    const target = join(root, 'snap')
    await mkdir(target)
    await writeFile(join(target, 'old.txt'), 'old')
    await expect(
      installDirectory(
        target,
        async () => {
          throw new Error('extract failed')
        },
        { replaceOccupied: true },
      ),
    ).rejects.toThrow('extract failed')
    expect(await readdir(target)).toEqual(['old.txt'])
  })
})
