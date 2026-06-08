import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { CostCategory, CostType, Currency, Prisma, UserRole } from 'generated/prisma/client'
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy'
import { assertCanEdit } from '../common/permissions'
import { ScopeService } from '../common/scope.service'
import { PrismaService } from '../prisma/prisma.service'
import { CreateCostDto } from './dto/create-cost.dto'
import { UpdateCostDto } from './dto/update-cost.dto'
import { CreateIncomeDto } from './dto/create-income.dto'
import { UpdateIncomeDto } from './dto/update-income.dto'
import { CreateQuoteDto } from './dto/create-quote.dto'
import { ListFinanceDto } from './dto/list-finance.dto'

interface CampaignBrief {
  id: number
  cycle: string
  cropName: string
  fieldId: number | null
  fieldName: string
}

export interface CostResponse {
  id: number
  campaignId: number
  category: CostCategory
  amount: number
  currency: Currency
  date: Date
  costType: CostType | null
  note: string | null
  creatorRole: UserRole
  campaign: CampaignBrief
}

export interface IncomeResponse {
  id: number
  campaignId: number
  crop: { id: number; name: string }
  quantity: number
  unitPrice: number
  currency: Currency
  date: Date
  note: string | null
  creatorRole: UserRole
  campaign: CampaignBrief
}

export interface QuoteResponse {
  id: number
  crop: { id: number; name: string }
  price: number
  currency: Currency
  date: Date
  source: string
}

const campaignBriefSelect = {
  id: true,
  cycle: true,
  fieldId: true,
  crop: { select: { name: true } },
  field: { select: { id: true, name: true } },
  subdivision: { select: { field: { select: { id: true, name: true } } } },
} as const

type CampaignBriefRow = Prisma.CampaignGetPayload<{ select: typeof campaignBriefSelect }>

function toCampaignBrief(row: CampaignBriefRow): CampaignBrief {
  const field = row.field ?? row.subdivision?.field ?? null
  return { id: row.id, cycle: row.cycle, cropName: row.crop.name, fieldId: field?.id ?? null, fieldName: field?.name ?? '—' }
}

const costSelect = {
  id: true,
  campaignId: true,
  category: true,
  amount: true,
  currency: true,
  date: true,
  costType: true,
  note: true,
  creatorRole: true,
  campaign: { select: campaignBriefSelect },
} as const

const incomeSelect = {
  id: true,
  campaignId: true,
  quantity: true,
  unitPrice: true,
  currency: true,
  date: true,
  note: true,
  creatorRole: true,
  crop: { select: { id: true, name: true } },
  campaign: { select: campaignBriefSelect },
} as const

@Injectable()
export class FinanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: ScopeService,
  ) {}

  // --- Costs ------------------------------------------------------------------

  async findCosts(query: ListFinanceDto, user: AuthenticatedUser): Promise<CostResponse[]> {
    const costs = await this.prisma.cost.findMany({
      where: await this.recordWhere(query, user),
      orderBy: { date: 'desc' },
      select: costSelect,
    })
    return costs.map(cost => ({ ...cost, campaign: toCampaignBrief(cost.campaign) }))
  }

  async createCost(dto: CreateCostDto, user: AuthenticatedUser): Promise<CostResponse> {
    await this.assertCampaignInScope(dto.campaignId, user)
    const cost = await this.prisma.cost.create({
      data: {
        campaignId: dto.campaignId,
        category: dto.category,
        amount: dto.amount,
        currency: dto.currency,
        date: new Date(dto.date),
        costType: dto.costType ?? null,
        note: dto.note,
        createdById: user.id,
        creatorRole: user.role,
      },
      select: costSelect,
    })
    return { ...cost, campaign: toCampaignBrief(cost.campaign) }
  }

  async updateCost(id: number, dto: UpdateCostDto, user: AuthenticatedUser): Promise<CostResponse> {
    await this.findEditableCost(id, user)
    const cost = await this.prisma.cost.update({
      where: { id },
      data: {
        category: dto.category,
        amount: dto.amount,
        currency: dto.currency,
        date: dto.date ? new Date(dto.date) : undefined,
        costType: dto.costType,
        note: dto.note,
      },
      select: costSelect,
    })
    return { ...cost, campaign: toCampaignBrief(cost.campaign) }
  }

  async removeCost(id: number, user: AuthenticatedUser): Promise<void> {
    await this.findEditableCost(id, user)
    await this.prisma.cost.delete({ where: { id } })
  }

  // --- Incomes ----------------------------------------------------------------

  async findIncomes(query: ListFinanceDto, user: AuthenticatedUser): Promise<IncomeResponse[]> {
    const incomes = await this.prisma.income.findMany({
      where: await this.recordWhere(query, user),
      orderBy: { date: 'desc' },
      select: incomeSelect,
    })
    return incomes.map(income => ({ ...income, campaign: toCampaignBrief(income.campaign) }))
  }

  async createIncome(dto: CreateIncomeDto, user: AuthenticatedUser): Promise<IncomeResponse> {
    await this.assertCampaignInScope(dto.campaignId, user)
    await this.assertCropExists(dto.cropId)
    const income = await this.prisma.income.create({
      data: {
        campaignId: dto.campaignId,
        cropId: dto.cropId,
        quantity: dto.quantity,
        unitPrice: dto.unitPrice,
        currency: dto.currency,
        date: new Date(dto.date),
        note: dto.note,
        createdById: user.id,
        creatorRole: user.role,
      },
      select: incomeSelect,
    })
    return { ...income, campaign: toCampaignBrief(income.campaign) }
  }

  async updateIncome(id: number, dto: UpdateIncomeDto, user: AuthenticatedUser): Promise<IncomeResponse> {
    await this.findEditableIncome(id, user)
    if (dto.cropId !== undefined) await this.assertCropExists(dto.cropId)
    const income = await this.prisma.income.update({
      where: { id },
      data: {
        cropId: dto.cropId,
        quantity: dto.quantity,
        unitPrice: dto.unitPrice,
        currency: dto.currency,
        date: dto.date ? new Date(dto.date) : undefined,
        note: dto.note,
      },
      select: incomeSelect,
    })
    return { ...income, campaign: toCampaignBrief(income.campaign) }
  }

  async removeIncome(id: number, user: AuthenticatedUser): Promise<void> {
    await this.findEditableIncome(id, user)
    await this.prisma.income.delete({ where: { id } })
  }

  // --- Quotes (account-scoped, manual) ---------------------------------------

  async findQuotes(user: AuthenticatedUser): Promise<QuoteResponse[]> {
    return this.prisma.quote.findMany({
      where: { accountId: this.scope.accountId(user) },
      orderBy: { date: 'desc' },
      select: { id: true, price: true, currency: true, date: true, source: true, crop: { select: { id: true, name: true } } },
    })
  }

  async createQuote(dto: CreateQuoteDto, user: AuthenticatedUser): Promise<QuoteResponse> {
    await this.assertCropExists(dto.cropId)
    return this.prisma.quote.create({
      data: {
        accountId: this.scope.accountId(user),
        cropId: dto.cropId,
        price: dto.price,
        currency: dto.currency,
        date: new Date(dto.date),
        source: dto.source ?? 'rosario',
        createdById: user.id,
        creatorRole: user.role,
      },
      select: { id: true, price: true, currency: true, date: true, source: true, crop: { select: { id: true, name: true } } },
    })
  }

  async removeQuote(id: number, user: AuthenticatedUser): Promise<void> {
    const quote = await this.prisma.quote.findFirst({
      where: { id, accountId: this.scope.accountId(user) },
      select: { id: true },
    })
    if (!quote) throw new NotFoundException('Quote not found')
    await this.prisma.quote.delete({ where: { id } })
  }

  // --- Helpers ----------------------------------------------------------------

  // Shared `where` for costs/incomes: account + accessible-fields + query filters.
  private async recordWhere(
    query: ListFinanceDto,
    user: AuthenticatedUser,
  ): Promise<Prisma.CostWhereInput & Prisma.IncomeWhereInput> {
    const where: Prisma.CostWhereInput & Prisma.IncomeWhereInput = {
      creator: { accountId: this.scope.accountId(user) },
    }
    if (query.campaignId) where.campaignId = query.campaignId

    const campaignClauses: Prisma.CampaignWhereInput[] = []
    if (query.fieldId) {
      campaignClauses.push({ OR: [{ fieldId: query.fieldId }, { subdivision: { fieldId: query.fieldId } }] })
    }
    const fieldClause = await this.scope.campaignFieldClause(user)
    if (fieldClause) campaignClauses.push(fieldClause)
    if (campaignClauses.length) where.campaign = { AND: campaignClauses }

    return where
  }

  private async campaignScopeWhere(campaignId: number, user: AuthenticatedUser): Promise<Prisma.CampaignWhereInput> {
    const where: Prisma.CampaignWhereInput = { id: campaignId, creator: { accountId: this.scope.accountId(user) } }
    const fieldClause = await this.scope.campaignFieldClause(user)
    if (fieldClause) where.AND = [fieldClause]
    return where
  }

  private async assertCampaignInScope(campaignId: number, user: AuthenticatedUser): Promise<void> {
    const campaign = await this.prisma.campaign.findFirst({
      where: await this.campaignScopeWhere(campaignId, user),
      select: { id: true },
    })
    if (!campaign) throw new BadRequestException('Campaign not found')
  }

  private async findEditableCost(id: number, user: AuthenticatedUser): Promise<void> {
    const cost = await this.prisma.cost.findFirst({
      where: { id, creator: { accountId: this.scope.accountId(user) }, campaign: await this.scopedCampaignFilter(user) },
      select: { createdById: true, creatorRole: true },
    })
    if (!cost) throw new NotFoundException('Cost not found')
    assertCanEdit(user, cost)
  }

  private async findEditableIncome(id: number, user: AuthenticatedUser): Promise<void> {
    const income = await this.prisma.income.findFirst({
      where: { id, creator: { accountId: this.scope.accountId(user) }, campaign: await this.scopedCampaignFilter(user) },
      select: { createdById: true, creatorRole: true },
    })
    if (!income) throw new NotFoundException('Income not found')
    assertCanEdit(user, income)
  }

  // Campaign relation filter for the field-access clause (undefined for ADMIN).
  private async scopedCampaignFilter(user: AuthenticatedUser): Promise<Prisma.CampaignWhereInput | undefined> {
    const fieldClause = await this.scope.campaignFieldClause(user)
    return fieldClause ?? undefined
  }

  private async assertCropExists(cropId: number): Promise<void> {
    const crop = await this.prisma.crop.findUnique({ where: { id: cropId }, select: { id: true } })
    if (!crop) throw new BadRequestException('Crop not found')
  }
}
