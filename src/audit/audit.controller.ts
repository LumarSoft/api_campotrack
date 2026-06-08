import { Controller, Get, UseGuards } from '@nestjs/common'
import { UserRole } from 'generated/prisma/client'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy'
import { Roles } from '../common/roles.decorator'
import { RolesGuard } from '../common/roles.guard'
import { AuditService, AuditLogResponse } from './audit.service'

// Audit trail — admin only (info.md §11).
@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser): Promise<AuditLogResponse[]> {
    return this.auditService.findAll(user)
  }
}
