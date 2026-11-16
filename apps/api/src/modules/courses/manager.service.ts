import type { Db, Tx } from '../../platform/db/client'
import { notFound } from '../../platform/errors'
import { isOwner, ownershipOf } from './access'
import { coursesRepo } from './courses.repo'

export interface CourseManagerDeps {
  db: Db
}

export interface CourseManager {
  deleteCourse(userId: string, courseId: string): Promise<void>
  removeForRepository(tx: Tx, userId: string, repositoryId: string): Promise<void>
  settleOwnerDeletion(tx: Tx, userId: string): Promise<void>
}

export function createCourseManager(deps: CourseManagerDeps): CourseManager {
  const { db } = deps
  const repo = coursesRepo(db)

  const owned = async (userId: string, courseId: string) => {
    const row = await repo.findById(courseId)
    if (!row || !isOwner(ownershipOf(row.course), userId)) notFound('Course')
    return row
  }

  return {
    async deleteCourse(userId, courseId) {
      const row = await owned(userId, courseId)
      await repo.deleteCourse(row.course.id)
    },

    async removeForRepository(tx, userId, repositoryId) {
      await coursesRepo(tx).deleteForUserRepo(userId, repositoryId)
    },

    async settleOwnerDeletion(tx, userId) {
      await coursesRepo(tx).deleteAllOf(userId)
    },
  }
}
