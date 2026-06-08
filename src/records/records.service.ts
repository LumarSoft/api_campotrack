import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma, RecordSubtype, UserRole } from 'generated/prisma/client'
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy'
import { assertCanEdit } from '../common/permissions'
import { ScopeService } from '../common/scope.service'
import { PrismaService } from '../prisma/prisma.service'
import { CreateRecordDto } from './dto/create-record.dto'
import { UpdateRecordDto } from './dto/update-record.dto'
import { ListRecordsDto } from './dto/list-records.dto'
import { validateRecordData } from './record-data'

export interface RecordResponse {
  id: number
  subtype: RecordSubtype
  recordDate: Date
  data: Record<string, unknown>
  photos: string[]
  clientUpdatedAt: Date | null
  creatorRole: UserRole
  createdAt: Date
  campaign: { id: number; cycle: string; cropName: string; fieldId: number | null; fieldName: string }
  subdivision: { id: number; name: string } | null
}

const recordSelect = {
  id: true,
  subtype: true,
  recordDate: true,
  data: true,
  photos: true,
  clientUpdatedAt: true,
  createdAt: true,
  creatorRole: true,
  campaign: {
    select: {
      id: true,
      cycle: true,
      fieldId: true,
      crop: { select: { name: true } },
      field: { select: { id: true, name: true } },
      subdivision: { select: { field: { select: { id: true, name: true } } } },
    },
  },
  subdivision: { select: { id: true, name: true } },
} as const

type RecordRow = Prisma.FieldRecordGetPayload<{ select: typeof recordSelect }>

function toRecordResponse(row: RecordRow): RecordResponse {
  const field = row.campaign.field ?? row.campaign.subdivision?.field ?? null
  return {
    id: row.id,
    subtype: row.subtype,
    recordDate: row.recordDate,
    data: (row.data as Record<string, unknown>) ?? {},
    photos: (row.photos as string[] | null) ?? [],
    clientUpdatedAt: row.clientUpdatedAt,
    creatorRole: row.creatorRole,
    createdAt: row.createdAt,
    campaign: {
      id: row.campaign.id,
      cycle: row.campaign.cycle,
      cropName: row.campaign.crop.name,
      fieldId: field?.id ?? null,
      fieldName: field?.name ?? '—',
    },
    subdivision: row.subdivision,
  }
}

@Injectable()
export class RecordsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: ScopeService,
  ) {}

  async findAll(query: ListRecordsDto, user: AuthenticatedUser): Promise<RecordResponse[]> {
    const where: Prisma.FieldRecordWhereInput = { creator: { accountId: this.scope.accountId(user) } }
    if (query.campaignId) where.campaignId = query.campaignId
    if (query.subdivisionId) where.subdivisionId = query.subdivisionId
    if (query.subtype) where.subtype = query.subtype

    const campaignClauses: Prisma.CampaignWhereInput[] = []
    if (query.fieldId) {
      campaignClauses.push({ OR: [{ fieldId: query.fieldId }, { subdivision: { fieldId: query.fieldId } }] })
    }
    const fieldClause = await this.scope.campaignFieldClause(user)
    if (fieldClause) campaignClauses.push(fieldClause)
    if (campaignClauses.length) where.campaign = { AND: campaignClauses }

    const records = await this.prisma.fieldRecord.findMany({
      where,
      orderBy: { recordDate: 'desc' },
      select: recordSelect,
    })
    return records.map(toRecordResponse)
  }

  async findOne(id: number, user: AuthenticatedUser): Promise<RecordResponse> {
    const record = await this.prisma.fieldRecord.findFirst({
      where: await this.scopedWhere(id, user),
      select: recordSelect,
    })
    if (!record) throw new NotFoundException('Record not found')
    return toRecordResponse(record)
  }

  async create(dto: CreateRecordDto, user: AuthenticatedUser): Promise<RecordResponse> {
    const data = validateRecordData(dto.subtype, dto.data)
    await this.assertCampaignExists(dto.campaignId, user)
    if (dto.subdivisionId !== undefined) await this.assertSubdivisionExists(dto.subdivisionId)

    const record = await this.prisma.fieldRecord.create({
      data: {
        subtype: dto.subtype,
        campaignId: dto.campaignId,
        subdivisionId: dto.subdivisionId ?? null,
        recordDate: new Date(dto.recordDate),
        data: data as Prisma.InputJsonValue,
        photos: dto.photos ? (dto.photos as Prisma.InputJsonValue) : undefined,
        clientUpdatedAt: dto.clientUpdatedAt ? new Date(dto.clientUpdatedAt) : null,
        createdById: user.id,
        creatorRole: user.role,
      },
      select: recordSelect,
    })
    return toRecordResponse(record)
  }

  async update(id: number, dto: UpdateRecordDto, user: AuthenticatedUser): Promise<RecordResponse> {
    const existing = await this.prisma.fieldRecord.findFirst({
      where: await this.scopedWhere(id, user),
      select: { subtype: true, createdById: true, creatorRole: true },
    })
    if (!existing) throw new NotFoundException('Record not found')
    assertCanEdit(user, existing)

    const data = dto.data ? validateRecordData(existing.subtype, dto.data) : undefined
    if (dto.subdivisionId !== undefined) await this.assertSubdivisionExists(dto.subdivisionId)

    const record = await this.prisma.fieldRecord.update({
      where: { id },
      data: {
        subdivisionId: dto.subdivisionId,
        recordDate: dto.recordDate ? new Date(dto.recordDate) : undefined,
        data: data ? (data as Prisma.InputJsonValue) : undefined,
        photos: dto.photos ? (dto.photos as Prisma.InputJsonValue) : undefined,
        clientUpdatedAt: dto.clientUpdatedAt ? new Date(dto.clientUpdatedAt) : undefined,
      },
      select: recordSelect,
    })
    return toRecordResponse(record)
  }

  async remove(id: number, user: AuthenticatedUser): Promise<void> {
    const record = await this.prisma.fieldRecord.findFirst({
      where: await this.scopedWhere(id, user),
      select: { createdById: true, creatorRole: true },
    })
    if (!record) throw new NotFoundException('Record not found')
    assertCanEdit(user, record)
    await this.prisma.fieldRecord.delete({ where: { id } })
  }

  // Scoped `where` for a single record: account + accessible-fields (via campaign).
  private async scopedWhere(id: number, user: AuthenticatedUser): Promise<Prisma.FieldRecordWhereInput> {
    const where: Prisma.FieldRecordWhereInput = { id, creator: { accountId: this.scope.accountId(user) } }
    const fieldClause = await this.scope.campaignFieldClause(user)
    if (fieldClause) where.campaign = { AND: [fieldClause] }
    return where
  }

  // The campaign must exist within the user's account/access.
  private async assertCampaignExists(campaignId: number, user: AuthenticatedUser): Promise<void> {
    const where: Prisma.CampaignWhereInput = { id: campaignId, creator: { accountId: this.scope.accountId(user) } }
    const fieldClause = await this.scope.campaignFieldClause(user)
    if (fieldClause) where.AND = [fieldClause]
    const campaign = await this.prisma.campaign.findFirst({ where, select: { id: true } })
    if (!campaign) throw new BadRequestException('Campaign not found')
  }

  private async assertSubdivisionExists(subdivisionId: number): Promise<void> {
    const subdivision = await this.prisma.subdivision.findUnique({
      where: { id: subdivisionId },
      select: { id: true },
    })
    if (!subdivision) throw new BadRequestException('Subdivision not found')
  }
}
