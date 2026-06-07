import { Injectable, NotFoundException } from '@nestjs/common'
import { UserRole } from 'generated/prisma/client'
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy'
import { assertCanEdit } from '../common/permissions'
import { ScopeService } from '../common/scope.service'
import { PrismaService } from '../prisma/prisma.service'
import { CreateClientDto } from './dto/create-client.dto'
import { UpdateClientDto } from './dto/update-client.dto'

export interface ClientResponse {
  id: number
  name: string
  contact: string | null
  notes: string | null
  fieldCount: number
  creatorRole: UserRole
}

const CLIENT_SELECT = {
  id: true,
  name: true,
  contact: true,
  notes: true,
  creatorRole: true,
  _count: { select: { fields: true } },
} as const

interface ClientRow {
  id: number
  name: string
  contact: string | null
  notes: string | null
  creatorRole: UserRole
  _count: { fields: number }
}

@Injectable()
export class ClientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: ScopeService,
  ) {}

  async findAll(user: AuthenticatedUser): Promise<ClientResponse[]> {
    const clients = await this.prisma.client.findMany({
      where: { creator: { accountId: this.scope.accountId(user) } },
      orderBy: { name: 'asc' },
      select: CLIENT_SELECT,
    })
    return clients.map(toClientResponse)
  }

  async findOne(id: number, user: AuthenticatedUser): Promise<ClientResponse> {
    const client = await this.prisma.client.findFirst({
      where: { id, creator: { accountId: this.scope.accountId(user) } },
      select: CLIENT_SELECT,
    })
    if (!client) throw new NotFoundException('Client not found')
    return toClientResponse(client)
  }

  async create(dto: CreateClientDto, user: AuthenticatedUser): Promise<ClientResponse> {
    const client = await this.prisma.client.create({
      data: { ...dto, createdById: user.id, creatorRole: user.role },
      select: CLIENT_SELECT,
    })
    return toClientResponse(client)
  }

  async update(id: number, dto: UpdateClientDto, user: AuthenticatedUser): Promise<ClientResponse> {
    await this.assertEditable(id, user)
    const client = await this.prisma.client.update({ where: { id }, data: dto, select: CLIENT_SELECT })
    return toClientResponse(client)
  }

  async remove(id: number, user: AuthenticatedUser): Promise<void> {
    await this.assertEditable(id, user)
    await this.prisma.client.delete({ where: { id } })
  }

  private async assertEditable(id: number, user: AuthenticatedUser): Promise<void> {
    const client = await this.prisma.client.findFirst({
      where: { id, creator: { accountId: this.scope.accountId(user) } },
      select: { createdById: true, creatorRole: true },
    })
    if (!client) throw new NotFoundException('Client not found')
    assertCanEdit(user, client)
  }
}

function toClientResponse(row: ClientRow): ClientResponse {
  return {
    id: row.id,
    name: row.name,
    contact: row.contact,
    notes: row.notes,
    creatorRole: row.creatorRole,
    fieldCount: row._count.fields,
  }
}
