import { createRouterClient } from '@orpc/server'
import { describe, expect, it, vi } from 'vitest'
import type { RequestContext } from '../../request-context'
import { coursesRouter } from './courses.router'

const COURSE_ID = '0198c7a0-0000-7000-8000-000000000001'

const clientWith = (deleteCourse: ReturnType<typeof vi.fn>) =>
  createRouterClient(coursesRouter, {
    context: {
      user: { id: 'user-1', name: null, email: null, image: null, role: 'user' },
      sessionId: 'session-1',
      setSessionToken: () => undefined,
      services: { courseManager: { deleteCourse } } as unknown as RequestContext['services'],
      idempotencyKey: undefined,
      requestId: 'request-1',
    },
  })

describe('courses router', () => {
  it('deletes the caller’s course', async () => {
    const deleteCourse = vi.fn(async () => undefined)
    const result = await clientWith(deleteCourse).delete({ courseId: COURSE_ID })
    expect(result).toEqual({ ok: true })
    expect(deleteCourse).toHaveBeenCalledWith('user-1', COURSE_ID)
  })
})
