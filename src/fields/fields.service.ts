import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { UserRole } from 'generated/prisma/client'
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy'
import { assertCanEdit } from '../common/permissions'
import { ScopeService } from '../common/scope.service'
import { PrismaService } from '../prisma/prisma.service'
import { CreateFieldDto } from './dto/create-field.dto'
import { UpdateFieldDto } from './dto/update-field.dto'
import { CreateLocationDto } from './dto/create-location.dto'
import { CreateSubdivisionDto } from './dto/create-subdivision.dto'
import { UpdateSubdivisionDto } from './dto/update-subdivision.dto'

interface ClientSummary {
  id: number
  name: string
}

export interface SubdivisionResponse {
  id: number
  name: string
  ha: number
  locationId: number | null
  creatorRole: UserRole
}

export interface LocationResponse {
  id: number
  locality: string
  lat: number | null
  lng: number | null
  ha: number
  subdivisions: SubdivisionResponse[]
}

interface CampaignSummary {
  id: number
  cycle: string
  ha: number
  creatorRole: UserRole
  crop: ClientSummary
  fieldId: number | null
  subdivisionId: number | null
  sowingDateEst: Date | null
  harvestDateEst: Date | null
  endDateEst: Date | null
}

export interface FieldListItem {
  id: number
  name: string
  totalHa: number
  creatorRole: UserRole
  clients: ClientSummary[]
  locationCount: number
  subdivisionCount: number
  campaignCount: number
  latestCampaign: { id: number; cycle: string; cropName: string } | null
}

export interface FieldDetailResponse {
  id: number
  name: string
  totalHa: number
  creatorRole: UserRole
  clients: ClientSummary[]
  locations: LocationResponse[]
  subdivisions: SubdivisionResponse[]
  campaigns: CampaignSummary[]
}

const subdivisionSelect = {
  id: true,
  name: true,
  ha: true,
  locationId: true,
  creatorRole: true,
} as const

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
} as const

@Injectable()
export class FieldsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: ScopeService,
  ) {}

  async findAll(user: AuthenticatedUser): Promise<FieldListItem[]> {
    const fields = await this.prisma.field.findMany({
      where: await this.scope.fieldWhere(user),
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        totalHa: true,
        creatorRole: true,
        clients: { select: { client: { select: { id: true, name: true } } } },
        _count: { select: { locations: true, subdivisions: true } },
      },
    })

    // Campaigns can hang off the field or one of its lotes; aggregate both so the
    // count and "current campaign" reflect lote campaigns too.
    const fieldIds = fields.map(field => field.id)
    const campaigns = await this.prisma.campaign.findMany({
      where: { OR: [{ fieldId: { in: fieldIds } }, { subdivision: { fieldId: { in: fieldIds } } }] },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        cycle: true,
        fieldId: true,
        crop: { select: { name: true } },
        subdivision: { select: { fieldId: true } },
      },
    })

    const byField = new Map<number, { count: number; latest: { id: number; cycle: string; cropName: string } | null }>()
    for (const campaign of campaigns) {
      const ownerFieldId = campaign.fieldId ?? campaign.subdivision?.fieldId
      if (!ownerFieldId) continue
      const entry = byField.get(ownerFieldId) ?? { count: 0, latest: null }
      entry.count += 1
      // Campaigns are ordered by createdAt desc, so the first seen is the latest.
      if (!entry.latest) entry.latest = { id: campaign.id, cycle: campaign.cycle, cropName: campaign.crop.name }
      byField.set(ownerFieldId, entry)
    }

    return fields.map(field => {
      const agg = byField.get(field.id)
      return {
        id: field.id,
        name: field.name,
        totalHa: field.totalHa,
        creatorRole: field.creatorRole,
        clients: field.clients.map(c => c.client),
        locationCount: field._count.locations,
        subdivisionCount: field._count.subdivisions,
        campaignCount: agg?.count ?? 0,
        latestCampaign: agg?.latest ?? null,
      }
    })
  }

  async findOne(id: number, user: AuthenticatedUser): Promise<FieldDetailResponse> {
    const field = await this.prisma.field.findFirst({
      where: { AND: [{ id }, await this.scope.fieldWhere(user)] },
      select: {
        id: true,
        name: true,
        totalHa: true,
        creatorRole: true,
        clients: { select: { client: { select: { id: true, name: true } } } },
        locations: {
          orderBy: { locality: 'asc' },
          select: {
            id: true,
            locality: true,
            lat: true,
            lng: true,
            ha: true,
            subdivisions: { orderBy: { name: 'asc' }, select: subdivisionSelect },
          },
        },
        subdivisions: { orderBy: { name: 'asc' }, select: subdivisionSelect },
      },
    })
    if (!field) throw new NotFoundException('Field not found')

    // Campaigns of the field include both whole-field ones (fieldId) and those
    // attached to one of its lotes (subdivisionId) — the relation alone misses
    // the latter, so we query both explicitly.
    const campaigns = await this.prisma.campaign.findMany({
      where: { OR: [{ fieldId: id }, { subdivision: { fieldId: id } }] },
      orderBy: { createdAt: 'desc' },
      select: campaignSelect,
    })

    return {
      id: field.id,
      name: field.name,
      totalHa: field.totalHa,
      creatorRole: field.creatorRole,
      clients: field.clients.map(c => c.client),
      locations: field.locations,
      subdivisions: field.subdivisions,
      campaigns,
    }
  }

  async create(dto: CreateFieldDto, user: AuthenticatedUser): Promise<FieldDetailResponse> {
    await this.assertClientsExist(dto.clientIds)
    const field = await this.prisma.field.create({
      data: {
        name: dto.name,
        totalHa: dto.totalHa,
        createdById: user.id,
        creatorRole: user.role,
        clients: dto.clientIds?.length ? { create: dto.clientIds.map(clientId => ({ clientId })) } : undefined,
      },
      select: { id: true },
    })
    // A non-admin creator must be granted access to its own new field, otherwise
    // field scoping would hide it from them (an ADMIN sees the whole account).
    if (user.role !== UserRole.ADMIN) {
      await this.prisma.userFieldAccess.create({ data: { userId: user.id, fieldId: field.id } })
    }
    return this.findOne(field.id, user)
  }

  async update(id: number, dto: UpdateFieldDto, user: AuthenticatedUser): Promise<FieldDetailResponse> {
    await this.assertFieldEditable(id, user)
    await this.assertClientsExist(dto.clientIds)
    await this.prisma.field.update({
      where: { id },
      data: {
        name: dto.name,
        totalHa: dto.totalHa,
        clients: dto.clientIds ? { deleteMany: {}, create: dto.clientIds.map(clientId => ({ clientId })) } : undefined,
      },
      select: { id: true },
    })
    return this.findOne(id, user)
  }

  async remove(id: number, user: AuthenticatedUser): Promise<void> {
    await this.assertFieldEditable(id, user)
    await this.prisma.field.delete({ where: { id } })
  }

  async addLocation(fieldId: number, dto: CreateLocationDto, user: AuthenticatedUser): Promise<FieldDetailResponse> {
    await this.assertFieldEditable(fieldId, user)
    await this.prisma.location.create({ data: { ...dto, fieldId }, select: { id: true } })
    return this.findOne(fieldId, user)
  }

  async removeLocation(fieldId: number, locationId: number, user: AuthenticatedUser): Promise<FieldDetailResponse> {
    await this.assertFieldEditable(fieldId, user)
    const location = await this.prisma.location.findFirst({
      where: { id: locationId, fieldId },
      select: { id: true },
    })
    if (!location) throw new NotFoundException('Location not found')
    await this.prisma.location.delete({ where: { id: locationId } })
    return this.findOne(fieldId, user)
  }

  async addSubdivision(
    fieldId: number,
    dto: CreateSubdivisionDto,
    user: AuthenticatedUser,
  ): Promise<FieldDetailResponse> {
    await this.assertFieldInScope(fieldId, user)
    if (dto.locationId !== undefined) await this.assertLocationInField(fieldId, dto.locationId)
    await this.assertSubdivisionsFitField(fieldId, dto.ha)
    await this.prisma.subdivision.create({
      data: {
        fieldId,
        locationId: dto.locationId ?? null,
        name: dto.name,
        ha: dto.ha,
        createdById: user.id,
        creatorRole: user.role,
      },
      select: { id: true },
    })
    return this.findOne(fieldId, user)
  }

  async updateSubdivision(
    fieldId: number,
    subdivisionId: number,
    dto: UpdateSubdivisionDto,
    user: AuthenticatedUser,
  ): Promise<FieldDetailResponse> {
    await this.assertFieldInScope(fieldId, user)
    const subdivision = await this.prisma.subdivision.findFirst({
      where: { id: subdivisionId, fieldId },
      select: { id: true, locationId: true, ha: true, createdById: true, creatorRole: true },
    })
    if (!subdivision) throw new NotFoundException('Subdivision not found')
    assertCanEdit(user, subdivision)

    const ha = dto.ha ?? subdivision.ha
    if (dto.locationId !== undefined) await this.assertLocationInField(fieldId, dto.locationId)
    await this.assertSubdivisionsFitField(fieldId, ha, subdivisionId)

    await this.prisma.subdivision.update({
      where: { id: subdivisionId },
      data: { locationId: dto.locationId, name: dto.name, ha: dto.ha },
      select: { id: true },
    })
    return this.findOne(fieldId, user)
  }

  async removeSubdivision(
    fieldId: number,
    subdivisionId: number,
    user: AuthenticatedUser,
  ): Promise<FieldDetailResponse> {
    await this.assertFieldInScope(fieldId, user)
    const subdivision = await this.prisma.subdivision.findFirst({
      where: { id: subdivisionId, fieldId },
      select: { createdById: true, creatorRole: true },
    })
    if (!subdivision) throw new NotFoundException('Subdivision not found')
    assertCanEdit(user, subdivision)
    await this.prisma.subdivision.delete({ where: { id: subdivisionId } })
    return this.findOne(fieldId, user)
  }

  // Field must be within the user's account/access — used before subdivision
  // ops, where the role-based edit rule applies to the subdivision, not the field.
  private async assertFieldInScope(id: number, user: AuthenticatedUser): Promise<void> {
    const field = await this.prisma.field.findFirst({
      where: { AND: [{ id }, await this.scope.fieldWhere(user)] },
      select: { id: true },
    })
    if (!field) throw new NotFoundException('Field not found')
  }

  private async assertFieldEditable(id: number, user: AuthenticatedUser): Promise<void> {
    const field = await this.prisma.field.findFirst({
      where: { AND: [{ id }, await this.scope.fieldWhere(user)] },
      select: { createdById: true, creatorRole: true },
    })
    if (!field) throw new NotFoundException('Field not found')
    assertCanEdit(user, field)
  }

  private async assertClientsExist(clientIds: number[] | undefined): Promise<void> {
    if (!clientIds || clientIds.length === 0) return
    const count = await this.prisma.client.count({ where: { id: { in: clientIds } } })
    if (count !== clientIds.length) throw new BadRequestException('One or more clients do not exist')
  }

  private async assertLocationInField(fieldId: number, locationId: number): Promise<void> {
    const location = await this.prisma.location.findFirst({
      where: { id: locationId, fieldId },
      select: { id: true },
    })
    if (!location) throw new BadRequestException('The location does not belong to this field')
  }

  // The lotes (subdivisions) of a field cannot add up to more than the field's
  // total surface (info.md §6).
  private async assertSubdivisionsFitField(fieldId: number, ha: number, excludeId?: number): Promise<void> {
    const field = await this.prisma.field.findUnique({ where: { id: fieldId }, select: { totalHa: true } })
    if (!field) throw new BadRequestException('Field not found')

    const aggregate = await this.prisma.subdivision.aggregate({
      where: { fieldId, id: excludeId ? { not: excludeId } : undefined },
      _sum: { ha: true },
    })
    const used = aggregate._sum.ha ?? 0
    // Allow a tiny float tolerance so e.g. 333.33 * 3 does not falsely overflow.
    if (used + ha > field.totalHa + 0.001) {
      throw new BadRequestException('Lotes exceed the total surface of the field')
    }
  }
}
