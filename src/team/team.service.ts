import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { randomUUID } from 'crypto'
import * as bcrypt from 'bcrypt'
import { InvitationStatus, Prisma, UserRole } from 'generated/prisma/client'
import { AuthService } from '../auth/auth.service'
import { AuthResponse } from '../auth/auth.types'
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy'
import { ScopeService } from '../common/scope.service'
import { PrismaService } from '../prisma/prisma.service'
import { CreateInvitationDto } from './dto/create-invitation.dto'
import { UpdateMemberDto } from './dto/update-member.dto'
import { AcceptInvitationDto } from './dto/accept-invitation.dto'

const SALT_ROUNDS = 10
const INVITATION_TTL_DAYS = 7

export interface InvitationResponse {
  id: number
  email: string
  role: UserRole
  token: string
  status: InvitationStatus
  fieldIds: number[]
  expiresAt: Date
  createdAt: Date
}

export interface MemberResponse {
  id: number
  name: string | null
  email: string
  role: UserRole
  /** The account owner (the registering admin) cannot be edited or removed. */
  isOwner: boolean
  fieldIds: number[]
}

export interface InvitationPreview {
  email: string
  role: UserRole
  accountName: string | null
}

const invitationSelect = {
  id: true,
  email: true,
  role: true,
  token: true,
  status: true,
  expiresAt: true,
  createdAt: true,
  fields: { select: { fieldId: true } },
} as const

type InvitationRow = Prisma.InvitationGetPayload<{ select: typeof invitationSelect }>

function toInvitationResponse(row: InvitationRow): InvitationResponse {
  const { fields, ...rest } = row
  return { ...rest, fieldIds: fields.map(f => f.fieldId) }
}

@Injectable()
export class TeamService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: ScopeService,
    private readonly auth: AuthService,
  ) {}

  // --- Members ----------------------------------------------------------------

  async listMembers(user: AuthenticatedUser): Promise<MemberResponse[]> {
    const accountId = this.scope.accountId(user)
    const members = await this.prisma.user.findMany({
      where: { accountId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true, email: true, role: true, fieldAccess: { select: { fieldId: true } } },
    })
    return members.map(member => ({
      id: member.id,
      name: member.name,
      email: member.email,
      role: member.role,
      isOwner: member.id === accountId,
      fieldIds: member.fieldAccess.map(access => access.fieldId),
    }))
  }

  async updateMember(id: number, dto: UpdateMemberDto, user: AuthenticatedUser): Promise<MemberResponse> {
    const accountId = this.scope.accountId(user)
    const member = await this.findAccountMember(id, accountId)
    if (member.id === accountId) throw new BadRequestException('The account owner cannot be modified')

    if (dto.fieldIds) await this.assertFieldsInAccount(dto.fieldIds, accountId)

    await this.prisma.$transaction(async tx => {
      if (dto.role) await tx.user.update({ where: { id }, data: { role: dto.role } })
      if (dto.fieldIds) {
        await tx.userFieldAccess.deleteMany({ where: { userId: id } })
        if (dto.fieldIds.length) {
          await tx.userFieldAccess.createMany({ data: dto.fieldIds.map(fieldId => ({ userId: id, fieldId })) })
        }
      }
    })

    const members = await this.listMembers(user)
    return members.find(m => m.id === id)!
  }

  async removeMember(id: number, user: AuthenticatedUser): Promise<void> {
    const accountId = this.scope.accountId(user)
    const member = await this.findAccountMember(id, accountId)
    if (member.id === accountId) throw new BadRequestException('The account owner cannot be removed')
    await this.prisma.user.delete({ where: { id } })
  }

  // --- Invitations ------------------------------------------------------------

  async createInvitation(dto: CreateInvitationDto, user: AuthenticatedUser): Promise<InvitationResponse> {
    const accountId = this.scope.accountId(user)

    const existingUser = await this.prisma.user.findUnique({ where: { email: dto.email }, select: { id: true } })
    if (existingUser) throw new BadRequestException('That email already belongs to a user')

    const pending = await this.prisma.invitation.findFirst({
      where: { email: dto.email, accountId, status: InvitationStatus.PENDING },
      select: { id: true },
    })
    if (pending) throw new BadRequestException('There is already a pending invitation for that email')

    if (dto.fieldIds) await this.assertFieldsInAccount(dto.fieldIds, accountId)

    const expiresAt = new Date(Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000)
    const invitation = await this.prisma.invitation.create({
      data: {
        email: dto.email,
        role: dto.role,
        token: randomUUID(),
        accountId,
        invitedById: user.id,
        expiresAt,
        fields: dto.fieldIds?.length ? { create: dto.fieldIds.map(fieldId => ({ fieldId })) } : undefined,
      },
      select: invitationSelect,
    })
    return toInvitationResponse(invitation)
  }

  async listInvitations(user: AuthenticatedUser): Promise<InvitationResponse[]> {
    const invitations = await this.prisma.invitation.findMany({
      where: { accountId: this.scope.accountId(user), status: InvitationStatus.PENDING },
      orderBy: { createdAt: 'desc' },
      select: invitationSelect,
    })
    return invitations.map(toInvitationResponse)
  }

  async revokeInvitation(id: number, user: AuthenticatedUser): Promise<void> {
    const invitation = await this.prisma.invitation.findFirst({
      where: { id, accountId: this.scope.accountId(user) },
      select: { id: true },
    })
    if (!invitation) throw new NotFoundException('Invitation not found')
    await this.prisma.invitation.update({ where: { id }, data: { status: InvitationStatus.REVOKED } })
  }

  // --- Public accept flow -----------------------------------------------------

  async previewInvitation(token: string): Promise<InvitationPreview> {
    const invitation = await this.findAcceptableInvitation(token)
    const owner = await this.prisma.user.findUnique({
      where: { id: invitation.accountId },
      select: { name: true },
    })
    return { email: invitation.email, role: invitation.role, accountName: owner?.name ?? null }
  }

  async acceptInvitation(token: string, dto: AcceptInvitationDto): Promise<AuthResponse> {
    const invitation = await this.findAcceptableInvitation(token)

    const existingUser = await this.prisma.user.findUnique({ where: { email: invitation.email }, select: { id: true } })
    if (existingUser) throw new BadRequestException('That email already belongs to a user')

    const hashedPassword = await bcrypt.hash(dto.password, SALT_ROUNDS)
    const user = await this.prisma.$transaction(async tx => {
      const created = await tx.user.create({
        data: {
          name: dto.name,
          email: invitation.email,
          password: hashedPassword,
          role: invitation.role,
          accountId: invitation.accountId,
        },
        select: { id: true },
      })
      if (invitation.fields.length) {
        await tx.userFieldAccess.createMany({
          data: invitation.fields.map(field => ({ userId: created.id, fieldId: field.fieldId })),
        })
      }
      await tx.invitation.update({ where: { id: invitation.id }, data: { status: InvitationStatus.ACCEPTED } })
      return created
    })

    return this.auth.issueSession(user.id)
  }

  // --- Helpers ----------------------------------------------------------------

  private async findAccountMember(id: number, accountId: number): Promise<{ id: number }> {
    const member = await this.prisma.user.findFirst({ where: { id, accountId }, select: { id: true } })
    if (!member) throw new NotFoundException('Member not found')
    return member
  }

  private async findAcceptableInvitation(
    token: string,
  ): Promise<{ id: number; email: string; role: UserRole; accountId: number; fields: { fieldId: number }[] }> {
    const invitation = await this.prisma.invitation.findUnique({
      where: { token },
      select: { id: true, email: true, role: true, accountId: true, status: true, expiresAt: true, fields: { select: { fieldId: true } } },
    })
    if (!invitation || invitation.status !== InvitationStatus.PENDING) {
      throw new NotFoundException('Invitation not found')
    }
    if (invitation.expiresAt < new Date()) throw new BadRequestException('This invitation has expired')
    return invitation
  }

  private async assertFieldsInAccount(fieldIds: number[], accountId: number): Promise<void> {
    if (fieldIds.length === 0) return
    const count = await this.prisma.field.count({
      where: { id: { in: fieldIds }, creator: { accountId } },
    })
    if (count !== fieldIds.length) throw new BadRequestException('One or more fields do not belong to your account')
  }
}
