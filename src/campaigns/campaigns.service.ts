import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma, UserRole } from 'generated/prisma/client'
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy'
import { assertCanEdit } from '../common/permissions'
import { ScopeService } from '../common/scope.service'
import { PrismaService } from '../prisma/prisma.service'
import { CreateCampaignDto } from './dto/create-campaign.dto'
import { UpdateCampaignDto } from './dto/update-campaign.dto'

export interface CampaignResponse {
  id: number
  cycle: string
  ha: number
  creatorRole: UserRole
  crop: { id: number; name: string }
  fieldId: number | null
  subdivisionId: number | null
  // Resolved labels for selectors (a campaign hangs off a field or a subdivision).
  fieldName: string
  subdivisionName: string | null
  sowingDateEst: Date | null
  harvestDateEst: Date | null
}

const campaignSelect = {
  id: true,
  cycle: true,
  ha: true,
  creatorRole: true,
  fieldId: true,
  subdivisionId: true,
  sowingDateEst: true,
  harvestDateEst: true,
  crop: { select: { id: true, name: true } },
  field: { select: { id: true, name: true } },
  subdivision: { select: { id: true, name: true, field: { select: { id: true, name: true } } } },
} as const

interface CampaignRow {
  id: number
  cycle: string
  ha: number
  creatorRole: UserRole
  crop: { id: number; name: string }
  fieldId: number | null
  subdivisionId: number | null
  sowingDateEst: Date | null
  harvestDateEst: Date | null
  field: { id: number; name: string } | null
  subdivision: { id: number; name: string; field: { id: number; name: string } } | null
}

function toCampaignResponse(row: CampaignRow): CampaignResponse {
  const { field, subdivision, ...rest } = row
  return {
    ...rest,
    fieldName: field?.name ?? subdivision?.field.name ?? '—',
    subdivisionName: subdivision?.name ?? null,
  }
}

@Injectable()
export class CampaignsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: ScopeService,
  ) {}

  async findAll(user: AuthenticatedUser, fieldId?: number): Promise<CampaignResponse[]> {
    const and: Prisma.CampaignWhereInput[] = []
    const fieldClause = await this.scope.campaignFieldClause(user)
    if (fieldClause) and.push(fieldClause)
    if (fieldId) and.push({ OR: [{ fieldId }, { subdivision: { fieldId } }] })

    const campaigns = await this.prisma.campaign.findMany({
      where: { creator: { accountId: this.scope.accountId(user) }, ...(and.length ? { AND: and } : {}) },
      orderBy: { createdAt: 'desc' },
      select: campaignSelect,
    })
    return campaigns.map(toCampaignResponse)
  }

  async findOne(id: number, user: AuthenticatedUser): Promise<CampaignResponse> {
    const campaign = await this.prisma.campaign.findFirst({
      where: await this.scopedWhere(id, user),
      select: campaignSelect,
    })
    if (!campaign) throw new NotFoundException('Campaign not found')
    return toCampaignResponse(campaign)
  }

  async create(dto: CreateCampaignDto, user: AuthenticatedUser): Promise<CampaignResponse> {
    await this.assertParentValid(dto.fieldId, dto.subdivisionId, user)
    await this.assertCropExists(dto.cropId)
    const campaign = await this.prisma.campaign.create({
      data: {
        fieldId: dto.fieldId ?? null,
        subdivisionId: dto.subdivisionId ?? null,
        cycle: dto.cycle,
        cropId: dto.cropId,
        ha: dto.ha,
        sowingDateEst: dto.sowingDateEst ? new Date(dto.sowingDateEst) : null,
        harvestDateEst: dto.harvestDateEst ? new Date(dto.harvestDateEst) : null,
        createdById: user.id,
        creatorRole: user.role,
      },
      select: campaignSelect,
    })
    return toCampaignResponse(campaign)
  }

  async update(id: number, dto: UpdateCampaignDto, user: AuthenticatedUser): Promise<CampaignResponse> {
    await this.findEditable(id, user)
    if (dto.cropId !== undefined) await this.assertCropExists(dto.cropId)

    const updated = await this.prisma.campaign.update({
      where: { id },
      data: {
        cycle: dto.cycle,
        cropId: dto.cropId,
        ha: dto.ha,
        sowingDateEst: dto.sowingDateEst ? new Date(dto.sowingDateEst) : undefined,
        harvestDateEst: dto.harvestDateEst ? new Date(dto.harvestDateEst) : undefined,
      },
      select: campaignSelect,
    })
    return toCampaignResponse(updated)
  }

  async remove(id: number, user: AuthenticatedUser): Promise<void> {
    await this.findEditable(id, user)
    await this.prisma.campaign.delete({ where: { id } })
  }

  // Scoped `where` for a single campaign: account + accessible-fields clause.
  private async scopedWhere(id: number, user: AuthenticatedUser): Promise<Prisma.CampaignWhereInput> {
    const where: Prisma.CampaignWhereInput = { id, creator: { accountId: this.scope.accountId(user) } }
    const fieldClause = await this.scope.campaignFieldClause(user)
    if (fieldClause) where.AND = [fieldClause]
    return where
  }

  private async findEditable(
    id: number,
    user: AuthenticatedUser,
  ): Promise<{ createdById: number; creatorRole: UserRole }> {
    const campaign = await this.prisma.campaign.findFirst({
      where: await this.scopedWhere(id, user),
      select: { createdById: true, creatorRole: true },
    })
    if (!campaign) throw new NotFoundException('Campaign not found')
    assertCanEdit(user, campaign)
    return campaign
  }

  // A campaign belongs to exactly one parent (a field or a subdivision), and the
  // parent must be within the user's account/access.
  private async assertParentValid(
    fieldId: number | undefined,
    subdivisionId: number | undefined,
    user: AuthenticatedUser,
  ): Promise<void> {
    if ((fieldId && subdivisionId) || (!fieldId && !subdivisionId)) {
      throw new BadRequestException('A campaign must belong to either a field or a subdivision')
    }
    if (fieldId) {
      const field = await this.prisma.field.findFirst({
        where: { AND: [{ id: fieldId }, await this.scope.fieldWhere(user)] },
        select: { id: true },
      })
      if (!field) throw new BadRequestException('Field not found')
    }
    if (subdivisionId) {
      const subdivision = await this.prisma.subdivision.findFirst({
        where: { id: subdivisionId, field: await this.scope.fieldWhere(user) },
        select: { id: true },
      })
      if (!subdivision) throw new BadRequestException('Subdivision not found')
    }
  }

  private async assertCropExists(cropId: number): Promise<void> {
    const crop = await this.prisma.crop.findUnique({ where: { id: cropId }, select: { id: true } })
    if (!crop) throw new BadRequestException('Crop not found')
  }
}
