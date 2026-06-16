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
  endDateEst: Date | null
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
  endDateEst: true,
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
  endDateEst: Date | null
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
    await this.assertNoOverlap(
      dto.fieldId ?? null,
      dto.subdivisionId ?? null,
      {
        sowing: dto.sowingDateEst ? new Date(dto.sowingDateEst) : null,
        harvest: dto.harvestDateEst ? new Date(dto.harvestDateEst) : null,
        end: dto.endDateEst ? new Date(dto.endDateEst) : null,
      },
      user,
    )
    const campaign = await this.prisma.campaign.create({
      data: {
        fieldId: dto.fieldId ?? null,
        subdivisionId: dto.subdivisionId ?? null,
        cycle: dto.cycle,
        cropId: dto.cropId,
        ha: dto.ha,
        sowingDateEst: dto.sowingDateEst ? new Date(dto.sowingDateEst) : null,
        harvestDateEst: dto.harvestDateEst ? new Date(dto.harvestDateEst) : null,
        endDateEst: dto.endDateEst ? new Date(dto.endDateEst) : null,
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

    // Re-check overlap against the merged dates of the campaign being edited.
    const current = await this.prisma.campaign.findUnique({
      where: { id },
      select: { fieldId: true, subdivisionId: true, sowingDateEst: true, harvestDateEst: true, endDateEst: true },
    })
    if (current) {
      await this.assertNoOverlap(
        current.fieldId,
        current.subdivisionId,
        {
          sowing: dto.sowingDateEst ? new Date(dto.sowingDateEst) : current.sowingDateEst,
          harvest: dto.harvestDateEst ? new Date(dto.harvestDateEst) : current.harvestDateEst,
          end: dto.endDateEst ? new Date(dto.endDateEst) : current.endDateEst,
        },
        user,
        id,
      )
    }

    const updated = await this.prisma.campaign.update({
      where: { id },
      data: {
        cycle: dto.cycle,
        cropId: dto.cropId,
        ha: dto.ha,
        sowingDateEst: dto.sowingDateEst ? new Date(dto.sowingDateEst) : undefined,
        harvestDateEst: dto.harvestDateEst ? new Date(dto.harvestDateEst) : undefined,
        endDateEst: dto.endDateEst ? new Date(dto.endDateEst) : undefined,
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

  /**
   * Two campaigns cannot overlap in time in the same place: the same lote, or a
   * whole-field campaign against any campaign of that field (info.md §6). Skipped
   * when there isn't enough date info to compare.
   */
  private async assertNoOverlap(
    fieldId: number | null,
    subdivisionId: number | null,
    dates: { sowing: Date | null; harvest: Date | null; end: Date | null },
    user: AuthenticatedUser,
    excludeId?: number,
  ): Promise<void> {
    const range = toDateRange(dates)
    if (!range) return

    let targetFieldId = fieldId
    if (!targetFieldId && subdivisionId) {
      const sub = await this.prisma.subdivision.findUnique({
        where: { id: subdivisionId },
        select: { fieldId: true },
      })
      targetFieldId = sub?.fieldId ?? null
    }
    if (!targetFieldId) return

    const candidates = await this.prisma.campaign.findMany({
      where: {
        id: excludeId ? { not: excludeId } : undefined,
        creator: { accountId: this.scope.accountId(user) },
        OR: [{ fieldId: targetFieldId }, { subdivision: { fieldId: targetFieldId } }],
      },
      select: {
        subdivisionId: true,
        sowingDateEst: true,
        harvestDateEst: true,
        endDateEst: true,
        cycle: true,
        crop: { select: { name: true } },
      },
    })

    for (const candidate of candidates) {
      // Same place: same lote, or either side is a whole-field campaign.
      const samePlace = subdivisionId == null || candidate.subdivisionId == null || candidate.subdivisionId === subdivisionId
      if (!samePlace) continue
      const other = toDateRange({
        sowing: candidate.sowingDateEst,
        harvest: candidate.harvestDateEst,
        end: candidate.endDateEst,
      })
      if (!other) continue
      if (range.start <= other.end && other.start <= range.end) {
        throw new BadRequestException(
          `Las fechas se superponen con la campaña ${candidate.crop.name} ${candidate.cycle} en el mismo lugar`,
        )
      }
    }
  }
}

/** Builds a [start, end] range from whichever campaign dates are available. */
function toDateRange(dates: { sowing: Date | null; harvest: Date | null; end: Date | null }): {
  start: Date
  end: Date
} | null {
  const start = dates.sowing ?? dates.end ?? dates.harvest
  const end = dates.end ?? dates.harvest ?? dates.sowing
  if (!start || !end) return null
  return start <= end ? { start, end } : { start: end, end: start }
}
