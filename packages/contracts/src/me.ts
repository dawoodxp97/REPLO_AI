import { oc } from '@orpc/contract'
import { z } from 'zod'
import { OkResult } from './common'

export const MeDto = z.object({
  user: z.object({
    id: z.string(),
    name: z.string().nullable(),
    email: z.string().nullable(),
    image: z.string().nullable(),
  }),
})
export type MeDto = z.infer<typeof MeDto>

export const DeleteAccountInput = z.object({
  confirm: z.literal('DELETE'),
  publicTutorials: z.enum(['delete', 'anonymise']).default('delete'),
})
export type DeleteAccountInput = z.infer<typeof DeleteAccountInput>

export const meContract = {
  get: oc.route({ method: 'GET', path: '/me' }).output(MeDto),
  deleteAccount: oc
    .route({ method: 'POST', path: '/me/delete' })
    .input(DeleteAccountInput)
    .output(OkResult),
}

export const GithubRepoDto = z.object({
  githubRepoId: z.number().int().positive(),
  owner: z.string(),
  name: z.string(),
  isPrivate: z.boolean(),
  defaultBranch: z.string(),
  installationId: z.number().int().positive(),
})
export type GithubRepoDto = z.infer<typeof GithubRepoDto>

export const githubContract = {
  installUrl: oc
    .route({ method: 'GET', path: '/github/install-url' })
    .output(z.object({ url: z.url() })),
  listRepos: oc.route({ method: 'GET', path: '/github/repos' }).output(z.array(GithubRepoDto)),
}
