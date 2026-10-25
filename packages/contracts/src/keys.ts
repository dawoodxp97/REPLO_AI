import { oc } from '@orpc/contract'
import { z } from 'zod'
import { OkResult, Provider } from './common'

export const KeyDto = z.object({
  id: z.uuid(),
  provider: Provider,
  label: z.string(),
  last4: z.string().length(4),
  lastValidatedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
})
export type KeyDto = z.infer<typeof KeyDto>

export const AddKeyInput = z.object({
  provider: Provider,
  label: z.string().min(1).max(64).default('default'),
  apiKey: z.string().min(8).max(512),
})
export type AddKeyInput = z.infer<typeof AddKeyInput>

export const keysContract = {
  list: oc.route({ method: 'GET', path: '/keys' }).output(z.array(KeyDto)),
  add: oc
    .route({ method: 'POST', path: '/keys' })
    .input(AddKeyInput)
    .output(KeyDto)
    .errors({ KEY_INVALID: {}, KEY_ALREADY_EXISTS: {}, KEY_CHECK_UNAVAILABLE: {} }),
  validate: oc
    .route({ method: 'POST', path: '/keys/{keyId}/validate' })
    .input(z.object({ keyId: z.uuid() }))
    .output(z.object({ valid: z.boolean() }))
    .errors({ KEY_CHECK_UNAVAILABLE: {} }),
  delete: oc
    .route({ method: 'DELETE', path: '/keys/{keyId}' })
    .input(z.object({ keyId: z.uuid() }))
    .output(OkResult),
}
