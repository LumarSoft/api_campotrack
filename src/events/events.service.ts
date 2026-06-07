import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { AlarmType, EventStatus, EventType, Prisma, UserRole } from 'generated/prisma/client'
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy'
import { assertCanEdit } from '../common/permissions'
import { ScopeService } from '../common/scope.service'
import { PrismaService } from '../prisma/prisma.service'
import { CreateEventDto } from './dto/create-event.dto'
import { UpdateEventDto } from './dto/update-event.dto'
import { PostponeEventDto } from './dto/postpone-event.dto'
import { ListEventsDto } from './dto/list-events.dto'

export interface EventResponse {
  id: number
  type: EventType
  plannedDate: Date
  actualDate: Date | null
  status: EventStatus
  /** Derived: a PLANNED event whose date is already in the past. */
  overdue: boolean
  suggestedBySystem: boolean
  note: string | null
  creatorRole: UserRole
  campaign: { id: number; cycle: string; cropName: string; fieldId: number | null; fieldName: string }
  subdivision: { id: number; name: string } | null
  alarms: AlarmType[]
}

const eventSelect = {
  id: true,
  type: true,
  plannedDate: true,
  actualDate: true,
  status: true,
  suggestedBySystem: true,
  note: true,
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
  alarms: { select: { type: true } },
} as const

type EventRow = Prisma.CalendarEventGetPayload<{ select: typeof eventSelect }>

function startOfToday(): Date {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return now
}

function toEventResponse(row: EventRow): EventResponse {
  const field = row.campaign.field ?? row.campaign.subdivision?.field ?? null
  return {
    id: row.id,
    type: row.type,
    plannedDate: row.plannedDate,
    actualDate: row.actualDate,
    status: row.status,
    overdue: row.status === EventStatus.PLANNED && row.plannedDate < startOfToday(),
    suggestedBySystem: row.suggestedBySystem,
    note: row.note,
    creatorRole: row.creatorRole,
    campaign: {
      id: row.campaign.id,
      cycle: row.campaign.cycle,
      cropName: row.campaign.crop.name,
      fieldId: field?.id ?? null,
      fieldName: field?.name ?? '—',
    },
    subdivision: row.subdivision,
    alarms: row.alarms.map(alarm => alarm.type),
  }
}

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: ScopeService,
  ) {}

  async findAll(query: ListEventsDto, user: AuthenticatedUser): Promise<EventResponse[]> {
    const where: Prisma.CalendarEventWhereInput = { creator: { accountId: this.scope.accountId(user) } }
    if (query.from || query.to) {
      const plannedDate: Prisma.DateTimeFilter = {}
      if (query.from) plannedDate.gte = new Date(query.from)
      if (query.to) plannedDate.lte = new Date(query.to)
      where.plannedDate = plannedDate
    }
    if (query.campaignId) where.campaignId = query.campaignId
    if (query.type) where.type = query.type

    // Field filters: the requested field (if any) intersected with the user's
    // accessible fields, both expressed through the related campaign.
    const campaignClauses: Prisma.CampaignWhereInput[] = []
    if (query.fieldId) {
      campaignClauses.push({ OR: [{ fieldId: query.fieldId }, { subdivision: { fieldId: query.fieldId } }] })
    }
    const fieldClause = await this.scope.campaignFieldClause(user)
    if (fieldClause) campaignClauses.push(fieldClause)
    if (campaignClauses.length) where.campaign = { AND: campaignClauses }

    const events = await this.prisma.calendarEvent.findMany({
      where,
      orderBy: { plannedDate: 'asc' },
      select: eventSelect,
    })
    return events.map(toEventResponse)
  }

  async findOne(id: number, user: AuthenticatedUser): Promise<EventResponse> {
    const event = await this.prisma.calendarEvent.findFirst({
      where: await this.scopedWhere(id, user),
      select: eventSelect,
    })
    if (!event) throw new NotFoundException('Event not found')
    return toEventResponse(event)
  }

  async create(dto: CreateEventDto, user: AuthenticatedUser): Promise<EventResponse> {
    await this.assertCampaignExists(dto.campaignId, user)
    if (dto.subdivisionId !== undefined) await this.assertSubdivisionExists(dto.subdivisionId)

    const event = await this.prisma.calendarEvent.create({
      data: {
        campaignId: dto.campaignId,
        subdivisionId: dto.subdivisionId ?? null,
        type: dto.type,
        plannedDate: new Date(dto.plannedDate),
        note: dto.note,
        suggestedBySystem: dto.suggestedBySystem ?? false,
        createdById: user.id,
        creatorRole: user.role,
        alarms: dto.alarms?.length ? { create: dto.alarms.map(type => ({ type })) } : undefined,
      },
      select: eventSelect,
    })
    return toEventResponse(event)
  }

  async update(id: number, dto: UpdateEventDto, user: AuthenticatedUser): Promise<EventResponse> {
    const existing = await this.findEditable(id, user)

    // Marking an event done without an explicit date stamps it now.
    const markingDone = dto.status === EventStatus.DONE
    const actualDate = dto.actualDate
      ? new Date(dto.actualDate)
      : markingDone && !existing.actualDate
        ? new Date()
        : undefined

    const updated = await this.prisma.calendarEvent.update({
      where: { id },
      data: {
        type: dto.type,
        plannedDate: dto.plannedDate ? new Date(dto.plannedDate) : undefined,
        status: dto.status,
        actualDate,
        note: dto.note,
        alarms: dto.alarms ? { deleteMany: {}, create: dto.alarms.map(type => ({ type })) } : undefined,
      },
      select: eventSelect,
    })
    return toEventResponse(updated)
  }

  // Postpone records the reason and reschedules the event (info.md §7).
  async postpone(id: number, dto: PostponeEventDto, user: AuthenticatedUser): Promise<EventResponse> {
    const existing = await this.findEditable(id, user)
    const newDate = new Date(dto.newDate)

    const updated = await this.prisma.calendarEvent.update({
      where: { id },
      data: {
        plannedDate: newDate,
        status: EventStatus.POSTPONED,
        postponements: {
          create: {
            previousDate: existing.plannedDate,
            newDate,
            cause: dto.cause,
            note: dto.note,
            userId: user.id,
          },
        },
      },
      select: eventSelect,
    })
    return toEventResponse(updated)
  }

  async remove(id: number, user: AuthenticatedUser): Promise<void> {
    await this.findEditable(id, user)
    await this.prisma.calendarEvent.delete({ where: { id } })
  }

  // Scoped `where` for a single event: account + accessible-fields (via campaign).
  private async scopedWhere(id: number, user: AuthenticatedUser): Promise<Prisma.CalendarEventWhereInput> {
    const where: Prisma.CalendarEventWhereInput = { id, creator: { accountId: this.scope.accountId(user) } }
    const fieldClause = await this.scope.campaignFieldClause(user)
    if (fieldClause) where.campaign = { AND: [fieldClause] }
    return where
  }

  private async findEditable(
    id: number,
    user: AuthenticatedUser,
  ): Promise<{ plannedDate: Date; actualDate: Date | null }> {
    const event = await this.prisma.calendarEvent.findFirst({
      where: await this.scopedWhere(id, user),
      select: { plannedDate: true, actualDate: true, createdById: true, creatorRole: true },
    })
    if (!event) throw new NotFoundException('Event not found')
    assertCanEdit(user, event)
    return { plannedDate: event.plannedDate, actualDate: event.actualDate }
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
