import { Injectable } from '@nestjs/common'
import { AuditAction, UserRole } from 'generated/prisma/client'
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy'
import { ScopeService } from '../common/scope.service'
import { PrismaService } from '../prisma/prisma.service'

export interface AuditLogResponse {
  id: number
  action: AuditAction
  entity: string
  entityId: number | null
  actorName: string | null
  actorRole: UserRole
  metadata: unknown
  createdAt: Date
}

const RECENT_LIMIT = 100

@Injectable()
export class AuditService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: ScopeService,
  ) {}

  async findAll(user: AuthenticatedUser): Promise<AuditLogResponse[]> {
    const logs = await this.prisma.auditLog.findMany({
      where: { accountId: this.scope.accountId(user) },
      orderBy: { createdAt: 'desc' },
      take: RECENT_LIMIT,
      select: {
        id: true,
        action: true,
        entity: true,
        entityId: true,
        actorRole: true,
        metadata: true,
        createdAt: true,
        actor: { select: { name: true } },
      },
    })

    return logs.map(log => ({
      id: log.id,
      action: log.action,
      entity: log.entity,
      entityId: log.entityId,
      actorName: log.actor.name,
      actorRole: log.actorRole,
      metadata: log.metadata,
      createdAt: log.createdAt,
    }))
  }
}
