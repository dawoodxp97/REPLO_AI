import { oc } from '@orpc/contract'
import { z } from 'zod'
import { Audience } from './common'

export const Theme = z.enum(['light', 'dark'])
export type Theme = z.infer<typeof Theme>

export const Preferences = z.object({
  theme: Theme,
  defaultAudience: Audience,
  autoAdvance: z.boolean(),
  quizzesEnabled: z.boolean(),
  browserNotifications: z.boolean(),
})
export type Preferences = z.infer<typeof Preferences>

export const settingsContract = {
  get: oc.route({ method: 'GET', path: '/settings' }).output(Preferences),
  update: oc
    .route({ method: 'PATCH', path: '/settings' })
    .input(Preferences.partial())
    .output(Preferences),
}
