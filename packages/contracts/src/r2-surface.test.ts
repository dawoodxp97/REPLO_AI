import { describe, expect, it } from 'vitest'
import { contract } from './index'

const GROUPS = [
  'auth',
  'me',
  'github',
  'keys',
  'models',
  'repositories',
  'jobs',
  'courses',
  'workspace',
  'learning',
  'settings',
  'notifications',
  'dashboard',
  'search',
  'admin',
] as const

const PROCEDURES: Record<(typeof GROUPS)[number], string[]> = {
  auth: ['providers', 'signUp', 'signIn', 'signOut'],
  me: ['get', 'deleteAccount'],
  github: ['installUrl', 'listRepos'],
  keys: ['list', 'add', 'validate', 'delete'],
  models: ['catalog', 'getPreferences', 'setPreferences'],
  repositories: ['preflight', 'import', 'list', 'remove', 'rerun'],
  jobs: ['get', 'listActive', 'cancel', 'retry'],
  courses: ['list', 'get', 'getChapter', 'getSource', 'delete'],
  workspace: ['graph', 'node', 'diagram', 'tree'],
  learning: ['getProgress', 'history', 'markLesson', 'unmarkLesson', 'submitQuiz'],
  settings: ['get', 'update'],
  notifications: ['list', 'unreadCount', 'markRead', 'markAllRead', 'delete'],
  dashboard: [
    'summary',
    'recent',
    'analytics',
    'save',
    'listDashboards',
    'deleteDashboard',
  ],
  search: ['all'],
  admin: ['overview', 'users', 'jobs', 'job', 'queues', 'system'],
}

describe('PRD §8 surface', () => {
  it('exposes exactly the release-1 groups', () => {
    expect(Object.keys(contract).sort()).toEqual([...GROUPS].sort())
  })

  for (const group of GROUPS) {
    it(`${group}.* exposes exactly ${PROCEDURES[group].join(', ')}`, () => {
      const slice = contract[group] as Record<string, unknown>
      expect(Object.keys(slice).sort()).toEqual([...PROCEDURES[group]].sort())
    })
  }

  it('drops the removed procedures', () => {
    expect(contract.auth).not.toHaveProperty('revokeOtherSessions')
    expect(contract.courses).not.toHaveProperty('sourceTree')
    expect(contract.search).not.toHaveProperty('own')
    expect(contract).not.toHaveProperty('operator')
  })
})