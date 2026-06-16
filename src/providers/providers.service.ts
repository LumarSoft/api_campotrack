import { Injectable, NotFoundException } from '@nestjs/common'
import { UserRole } from 'generated/prisma/client'
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy'
import { assertCanEdit } from '../common/permissions'
import { ScopeService } from '../common/scope.service'
import { PrismaService } from '../prisma/prisma.service'
import { CreateProviderDto } from './dto/create-provider.dto'
import { UpdateProviderDto } from './dto/update-provider.dto'

export interface ProviderResponse {
  id: number
  name: string
  contact: string | null
  notes: string | null
  costCount: number
  creatorRole: UserRole
}

const PROVIDER_SELECT = {
  id: true,
  name: true,
  contact: true,
  notes: true,
  creatorRole: true,
  _count: { select: { costs: true } },
} as const

interface ProviderRow {
  id: number
  name: string
  contact: string | null
  notes: string | null
  creatorRole: UserRole
  _count: { costs: number }
}

@Injectable()
export class ProvidersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: ScopeService,
  ) {}

  async findAll(user: AuthenticatedUser): Promise<ProviderResponse[]> {
    const providers = await this.prisma.provider.findMany({
      where: { creator: { accountId: this.scope.accountId(user) } },
      orderBy: { name: 'asc' },
      select: PROVIDER_SELECT,
    })
    return providers.map(toProviderResponse)
  }

  async create(dto: CreateProviderDto, user: AuthenticatedUser): Promise<ProviderResponse> {
    const provider = await this.prisma.provider.create({
      data: { ...dto, createdById: user.id, creatorRole: user.role },
      select: PROVIDER_SELECT,
    })
    return toProviderResponse(provider)
  }

  async update(id: number, dto: UpdateProviderDto, user: AuthenticatedUser): Promise<ProviderResponse> {
    await this.assertEditable(id, user)
    const provider = await this.prisma.provider.update({ where: { id }, data: dto, select: PROVIDER_SELECT })
    return toProviderResponse(provider)
  }

  async remove(id: number, user: AuthenticatedUser): Promise<void> {
    await this.assertEditable(id, user)
    await this.prisma.provider.delete({ where: { id } })
  }

  private async assertEditable(id: number, user: AuthenticatedUser): Promise<void> {
    const provider = await this.prisma.provider.findFirst({
      where: { id, creator: { accountId: this.scope.accountId(user) } },
      select: { createdById: true, creatorRole: true },
    })
    if (!provider) throw new NotFoundException('Provider not found')
    assertCanEdit(user, provider)
  }
}

function toProviderResponse(row: ProviderRow): ProviderResponse {
  return {
    id: row.id,
    name: row.name,
    contact: row.contact,
    notes: row.notes,
    creatorRole: row.creatorRole,
    costCount: row._count.costs,
  }
}
