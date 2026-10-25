import { Button } from './Button'

describe('Button', () => {
  it('renders its label', () => {
    expect(Button({ label: 'Save' })).toBeTruthy()
  })
})
