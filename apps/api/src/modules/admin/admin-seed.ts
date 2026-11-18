import { eq } from 'drizzle-orm'
import type { Db } from '../../platform/db/client'
import { users } from '../../platform/db/auth-schema'

export interface AdminSeeder {
  seed(emailList: string | undefined): Promise<void>
}

export function createAdminSeeder(db: Db): AdminSeeder {
  return {
    async seed(emailList) {
      const emails = parseAdminEmails(emailList)
      if (emails.length === 0) return
      for (const email of emails) {
        await db.update(users).set({ role: 'admin' }).where(eq(users.email, email))
      }
    },
  }
}

export function parseAdminEmails(emailList: string | undefined): string[] {
  if (!emailList) return []
  return emailList
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.length > 0)
}