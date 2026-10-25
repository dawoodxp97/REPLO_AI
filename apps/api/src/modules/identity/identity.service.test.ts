import { describe, expect, it } from 'vitest'
import { createIdentityService, type LinkedAccount, type LinkedAccounts } from './identity.service'

const headers = new Headers()

function accountsWith(
  linked: LinkedAccount[],
  tokens: Record<string, string | Error>,
): LinkedAccounts {
  return {
    list: async () => linked,
    accessToken: async (accountId) => {
      const token = tokens[accountId]
      if (token instanceof Error) throw token
      return token
    },
  }
}

const untouched = () =>
  Promise.reject(new Error('the GitHub token lookup never reaches the database'))

const service = (accounts: LinkedAccounts) =>
  createIdentityService({
    db: { transaction: untouched },
    accounts,
    tutorials: { settleOwnerDeletion: untouched },
  })

describe('githubAccessToken', () => {
  it('returns the GitHub token of the linked GitHub account', async () => {
    const accounts = accountsWith(
      [
        { id: 'acc-google', providerId: 'google' },
        { id: 'acc-github', providerId: 'github' },
      ],
      { 'acc-github': 'ghu_user_token', 'acc-google': 'other' },
    )
    expect(await service(accounts).githubAccessToken(headers)).toBe('ghu_user_token')
  })

  it('is undefined when GitHub is not linked', async () => {
    const accounts = accountsWith([{ id: 'acc-google', providerId: 'google' }], {})
    expect(await service(accounts).githubAccessToken(headers)).toBeUndefined()
  })

  it('propagates a token refresh failure instead of reporting GitHub as not linked', async () => {
    const accounts = accountsWith([{ id: 'acc-github', providerId: 'github' }], {
      'acc-github': new Error('refresh failed'),
    })
    await expect(service(accounts).githubAccessToken(headers)).rejects.toThrow('refresh failed')
  })
})
