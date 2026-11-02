import { defaultHandlers } from '../fixtures/handlers'
import { createMockApi } from './mock-api'
import { MOCK_API_PORT } from './origins'

createMockApi(defaultHandlers()).listen(MOCK_API_PORT, () => {
  process.stdout.write(`mock api listening on ${MOCK_API_PORT}\n`)
})
