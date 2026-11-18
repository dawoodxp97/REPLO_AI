export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(path)
  return response.json() as Promise<T>
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(path, { method: 'POST', body: JSON.stringify(body) })
  return response.json() as Promise<T>
}
