import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { UserRole } from 'generated/prisma/client'
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy'
import { ROLES_KEY } from './roles.decorator'

/**
 * Allows the request only if the authenticated user's role is in the list set
 * by `@Roles(...)`. Routes without `@Roles` are not restricted by this guard.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (!required || required.length === 0) return true

    const { user } = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>()
    if (!user || !required.includes(user.role)) {
      throw new ForbiddenException('You do not have permission to perform this action')
    }
    return true
  }
}
