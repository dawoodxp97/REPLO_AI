import { dashboardRouter } from './modules/dashboard/dashboard.router'
import { jobsRouter } from './modules/generation/generation.router'
import { githubRouter } from './modules/github/github.router'
import { meRouter } from './modules/identity/identity.router'
import { keysRouter } from './modules/keys/keys.router'
import { learningRouter } from './modules/learning/learning.router'
import { modelsRouter } from './modules/models/models.router'
import { notificationsRouter } from './modules/notifications/notifications.router'
import { operatorRouter } from './modules/operator/operator.router'
import { repositoriesRouter } from './modules/repositories/repositories.router'
import { searchRouter } from './modules/search/search.router'
import { settingsRouter } from './modules/settings/settings.router'
import { tutorialsRouter } from './modules/tutorials/tutorials.router'
import { os } from './orpc'

export const router = os.router({
  me: meRouter,
  github: githubRouter,
  keys: keysRouter,
  models: modelsRouter,
  repositories: repositoriesRouter,
  jobs: jobsRouter,
  tutorials: tutorialsRouter,
  learning: learningRouter,
  settings: settingsRouter,
  notifications: notificationsRouter,
  dashboard: dashboardRouter,
  search: searchRouter,
  operator: operatorRouter,
})
