import { format } from './format'

it('trims and lower-cases', () => {
  expect(format('  Hi ')).toBe('hi')
})
