import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common'
import { UserRole } from 'generated/prisma/client'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { Roles } from '../common/roles.decorator'
import { RolesGuard } from '../common/roles.guard'
import { CropsService, CropResponse } from './crops.service'
import { CreateCropDto } from './dto/create-crop.dto'
import { UpdateCropDto } from './dto/update-crop.dto'

// Crop catalog: readable by any authenticated user, editable only by the admin.
@Controller('crops')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CropsController {
  constructor(private readonly cropsService: CropsService) {}

  @Get()
  findAll(): Promise<CropResponse[]> {
    return this.cropsService.findAll()
  }

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateCropDto): Promise<CropResponse> {
    return this.cropsService.create(dto)
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCropDto): Promise<CropResponse> {
    return this.cropsService.update(id, dto)
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.cropsService.remove(id)
  }
}
