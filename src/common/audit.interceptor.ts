import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common'
import { AuditAction, Prisma } from 'generated/prisma/client'
import { Observable, tap } from 'rxjs'
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy'
import { PrismaService } from '../prisma/prisma.service'

const METHOD_ACTION: Record<string, AuditAction> = {
  POST: AuditAction.CREATE,
  PATCH: AuditAction.UPDATE,
  PUT: AuditAction.UPDATE,
  DELETE: AuditAction.DELETE,
}

// Don't audit auth flows or reads of the audit log itself.
const SKIP_ENTITIES = new Set(['auth', 'audit'])
const SENSITIVE_KEYS = new Set(['password', 'token'])

interface AuditableRequest {
  method: string
  originalUrl?: string
  url: string
  params: Record<string, string>
  body: unknown
  user?: AuthenticatedUser
}

/**
 * Records who changed what and when (info.md §11). Logs mutating requests
 * (POST/PATCH/PUT/DELETE) on domain controllers, deriving the entity from the
 * URL and the id from the response or route params. Never fails the request.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<AuditableRequest>()
    const action = METHOD_ACTION[req.method]

    return next.handle().pipe(
      tap(response => {
        if (!action || !req.user) return
        const entity = this.entityFromUrl(req)
        if (!entity || SKIP_ENTITIES.has(entity)) return
        void this.write(req.user, action, entity, this.entityId(response, req.params), req.body)
      }),
    )
  }

  private entityFromUrl(req: AuditableRequest): string | null {
    const path = (req.originalUrl ?? req.url).split('?')[0]
    return path.split('/').filter(Boolean)[0] ?? null
  }

  private entityId(response: unknown, params: Record<string, string>): number | null {
    if (response && typeof response === 'object' && 'id' in response) {
      const id = (response as { id: unknown }).id
      if (typeof id === 'number') return id
    }
    const fromParams = Number(params?.id)
    return Number.isFinite(fromParams) ? fromParams : null
  }

  private async write(
    user: AuthenticatedUser,
    action: AuditAction,
    entity: string,
    entityId: number | null,
    body: unknown,
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          accountId: user.accountId ?? user.id,
          actorId: user.id,
          actorRole: user.role,
          action,
          entity,
          entityId,
          metadata: this.sanitize(body),
        },
      })
    } catch {
      // Auditing must never break the underlying request.
    }
  }

  private sanitize(body: unknown): Prisma.InputJsonValue | undefined {
    if (!body || typeof body !== 'object') return undefined
    const clean: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
      if (!SENSITIVE_KEYS.has(key)) clean[key] = value
    }
    return clean as Prisma.InputJsonValue
  }
}
