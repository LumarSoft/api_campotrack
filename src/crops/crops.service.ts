import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateCropDto } from './dto/create-crop.dto'
import { UpdateCropDto } from './dto/update-crop.dto'

export interface CropResponse {
  id: number
  name: string
  sowingFromMonth: number | null
  sowingToMonth: number | null
}

const CROP_SELECT = { id: true, name: true, sowingFromMonth: true, sowingToMonth: true } as const

@Injectable()
export class CropsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<CropResponse[]> {
    return this.prisma.crop.findMany({ orderBy: { name: 'asc' }, select: CROP_SELECT })
  }

  async create(dto: CreateCropDto): Promise<CropResponse> {
    const existing = await this.prisma.crop.findUnique({ where: { name: dto.name }, select: { id: true } })
    if (existing) throw new ConflictException('A crop with this name already exists')
    return this.prisma.crop.create({
      data: {
        name: dto.name,
        sowingFromMonth: dto.sowingFromMonth ?? null,
        sowingToMonth: dto.sowingToMonth ?? null,
      },
      select: CROP_SELECT,
    })
  }

  async update(id: number, dto: UpdateCropDto): Promise<CropResponse> {
    await this.ensureExists(id)
    return this.prisma.crop.update({
      where: { id },
      data: {
        name: dto.name,
        sowingFromMonth: dto.sowingFromMonth,
        sowingToMonth: dto.sowingToMonth,
      },
      select: CROP_SELECT,
    })
  }

  async remove(id: number): Promise<void> {
    await this.ensureExists(id)
    await this.prisma.crop.delete({ where: { id } })
  }

  private async ensureExists(id: number): Promise<void> {
    const crop = await this.prisma.crop.findUnique({ where: { id }, select: { id: true } })
    if (!crop) throw new NotFoundException('Crop not found')
  }
}
