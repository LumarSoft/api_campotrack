import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import { Request } from 'express'
import { AuthenticatedUser } from '../strategies/jwt.strategy'

/**
 * Injects the user attached to the request by `JwtAuthGuard` / `JwtStrategy`.
 * Only meaningful on routes protected by the guard.
 */
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
  const request = ctx.switchToHttp().getRequest<Request & { user: AuthenticatedUser }>()
  return request.user
})
