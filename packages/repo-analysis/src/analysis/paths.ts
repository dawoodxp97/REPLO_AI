export const normalizePath = (path: string): string | undefined => {
  const out: string[] = []
  for (const segment of path.split('/')) {
    if (segment === '' || segment === '.') continue
    if (segment === '..') {
      if (out.length === 0) return undefined
      out.pop()
    } else out.push(segment)
  }
  return out.join('/')
}

export const dirOf = (path: string): string => {
  const index = path.lastIndexOf('/')
  return index === -1 ? '' : path.slice(0, index)
}

export const joinPath = (...parts: string[]): string | undefined => normalizePath(parts.join('/'))
