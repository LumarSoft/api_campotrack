import { Injectable } from '@nestjs/common'
import { Prisma, UserRole } from 'generated/prisma/client'
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy'
import { PrismaService } from '../prisma/prisma.service'

/**
 * Account isolation + per-field scoping (info.md §2, §11).
 *
 * Every record is owned by its `creator`, who belongs to an account. Data is
 * scoped to the requester's account; a MEMBER/PRODUCER is further limited to the
 * fields granted in `UserFieldAccess`, while an ADMIN sees the whole account.
 */
@Injectable()
export class ScopeService {
  constructor(private readonly prisma: PrismaService) {}

  /** The account the user belongs to (its own id for the owning ADMIN). */
  accountId(user: AuthenticatedUser): number {
    return user.accountId ?? user.id
  }

  /** Field ids the user may access, or `null` for an ADMIN (all account fields). */
  async accessibleFieldIds(user: AuthenticatedUser): Promise<number[] | null> {
    if (user.role === UserRole.ADMIN) return null
    const rows = await this.prisma.userFieldAccess.findMany({
      where: { userId: user.id },
      select: { fieldId: true },
    })
    return rows.map(row => row.fieldId)
  }

  /** `where` for the Field entity, scoped to the user's account and access. */
  async fieldWhere(user: AuthenticatedUser): Promise<Prisma.FieldWhereInput> {
    const where: Prisma.FieldWhereInput = { creator: { accountId: this.accountId(user) } }
    const ids = await this.accessibleFieldIds(user)
    if (ids !== null) where.id = { in: ids }
    return where
  }

  /**
   * Field-scope clause for entities that reach a field through a campaign
   * (campaigns directly, events and records via their campaign). Returns `null`
   * for an ADMIN, meaning "no field restriction".
   */
  async campaignFieldClause(user: AuthenticatedUser): Promise<Prisma.CampaignWhereInput | null> {
    const ids = await this.accessibleFieldIds(user)
    if (ids === null) return null
    return { OR: [{ fieldId: { in: ids } }, { subdivision: { fieldId: { in: ids } } }] }
  }
}
