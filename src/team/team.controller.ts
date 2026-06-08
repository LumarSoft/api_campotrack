import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common'
import { UserRole } from 'generated/prisma/client'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy'
import { AuthResponse } from '../auth/auth.types'
import { Roles } from '../common/roles.decorator'
import { RolesGuard } from '../common/roles.guard'
import { TeamService, InvitationResponse, InvitationPreview, MemberResponse } from './team.service'
import { CreateInvitationDto } from './dto/create-invitation.dto'
import { UpdateMemberDto } from './dto/update-member.dto'
import { AcceptInvitationDto } from './dto/accept-invitation.dto'

// Team & permissions — admin only (info.md §11).
@Controller('team')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @Get('members')
  listMembers(@CurrentUser() user: AuthenticatedUser): Promise<MemberResponse[]> {
    return this.teamService.listMembers(user)
  }

  @Patch('members/:id')
  updateMember(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMemberDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MemberResponse> {
    return this.teamService.updateMember(id, dto, user)
  }

  @Delete('members/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeMember(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser): Promise<void> {
    return this.teamService.removeMember(id, user)
  }

  @Post('invitations')
  createInvitation(
    @Body() dto: CreateInvitationDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<InvitationResponse> {
    return this.teamService.createInvitation(dto, user)
  }

  @Get('invitations')
  listInvitations(@CurrentUser() user: AuthenticatedUser): Promise<InvitationResponse[]> {
    return this.teamService.listInvitations(user)
  }

  @Delete('invitations/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  revokeInvitation(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser): Promise<void> {
    return this.teamService.revokeInvitation(id, user)
  }
}

// Public accept flow: no authentication (the invitee has no account yet).
@Controller('team/invitations')
export class PublicInvitationsController {
  constructor(private readonly teamService: TeamService) {}

  @Get(':token')
  preview(@Param('token') token: string): Promise<InvitationPreview> {
    return this.teamService.previewInvitation(token)
  }

  @Post(':token/accept')
  accept(@Param('token') token: string, @Body() dto: AcceptInvitationDto): Promise<AuthResponse> {
    return this.teamService.acceptInvitation(token, dto)
  }
}
