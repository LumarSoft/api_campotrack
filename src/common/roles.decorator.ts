import { SetMetadata } from '@nestjs/common'
import { UserRole } from 'generated/prisma/client'

export const ROLES_KEY = 'roles'

/**
 * Restricts a route to the given roles. Must be combined with `JwtAuthGuard`
 * (which populates `request.user`) and `RolesGuard`.
 */
export const Roles = (...roles: UserRole[]): MethodDecorator & ClassDecorator => SetMetadata(ROLES_KEY, roles)
