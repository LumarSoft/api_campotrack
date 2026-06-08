import { ForbiddenException } from '@nestjs/common'
import { UserRole } from 'generated/prisma/client'

/**
 * Data hierarchy rule (info.md §2): what the ADMIN loads has more weight.
 * - ADMIN can edit/delete anything.
 * - MEMBER and PRODUCER cannot edit/delete records created by an ADMIN.
 * - A MEMBER may only edit its own records.
 *
 * Throws `ForbiddenException` when the editor is not allowed to mutate a record
 * created by `creatorRole` / `creatorId`.
 */
export function assertCanEdit(
  editor: { id: number; role: UserRole },
  record: { creatorRole: UserRole; createdById: number },
): void {
  if (editor.role === UserRole.ADMIN) return

  if (record.creatorRole === UserRole.ADMIN) {
    throw new ForbiddenException('Only an admin can modify records created by an admin')
  }

  if (editor.role === UserRole.MEMBER && record.createdById !== editor.id) {
    throw new ForbiddenException('Members can only modify their own records')
  }
}
