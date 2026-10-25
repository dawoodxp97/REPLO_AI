import { defaultHandlers } from '../fixtures/handlers'
import { createMockApi } from './mock-api'
import { MOCK_API_PORT } from './origins'

export default async function globalSetup() {
  const server = createMockApi(defaultHandlers())
  await new Promise<void>((resolve) => server.listen(MOCK_API_PORT, resolve))
  return async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    )
  }
}
