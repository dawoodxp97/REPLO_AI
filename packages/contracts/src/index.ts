import { authContract } from './auth'
import { dashboardContract } from './dashboard'
import { jobsContract } from './jobs'
import { keysContract } from './keys'
import { learningContract } from './learning'
import { githubContract, meContract } from './me'
import { modelsContract } from './models'
import { notificationsContract } from './notifications'
import { adminContract } from './admin'
import { repositoriesContract } from './repositories'
import { searchContract } from './search'
import { settingsContract } from './settings'
import { coursesContract } from './courses'
import { workspaceContract } from './workspace'

export const contract = {
  auth: authContract,
  me: meContract,
  github: githubContract,
  keys: keysContract,
  models: modelsContract,
  repositories: repositoriesContract,
  jobs: jobsContract,
  courses: coursesContract,
  workspace: workspaceContract,
  learning: learningContract,
  settings: settingsContract,
  notifications: notificationsContract,
  dashboard: dashboardContract,
  search: searchContract,
  admin: adminContract,
}
export type Contract = typeof contract

export * from './auth'
export * from './common'
export * from './jobs'
export * from './keys'
export * from './learning'
export * from './me'
export * from './models'
export * from './repositories'
export * from './courses'
export * from './course/content'
export * from './workspace'
export * from './settings'
export * from './notifications'
export * from './dashboard'
export * from './search'
export * from './admin'