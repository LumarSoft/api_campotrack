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
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy'
import { Roles } from '../common/roles.decorator'
import { RolesGuard } from '../common/roles.guard'
import { FieldsService, FieldDetailResponse, FieldListItem } from './fields.service'
import { CreateFieldDto } from './dto/create-field.dto'
import { UpdateFieldDto } from './dto/update-field.dto'
import { CreateLocationDto } from './dto/create-location.dto'
import { CreateSubdivisionDto } from './dto/create-subdivision.dto'
import { UpdateSubdivisionDto } from './dto/update-subdivision.dto'

// Field aggregate: the field itself plus its locations and subdivisions.
// Producers cannot create fields (info.md §2 matrix); admins/members can.
@Controller('fields')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FieldsController {
  constructor(private readonly fieldsService: FieldsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser): Promise<FieldListItem[]> {
    return this.fieldsService.findAll(user)
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<FieldDetailResponse> {
    return this.fieldsService.findOne(id, user)
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MEMBER)
  create(@Body() dto: CreateFieldDto, @CurrentUser() user: AuthenticatedUser): Promise<FieldDetailResponse> {
    return this.fieldsService.create(dto, user)
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MEMBER)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFieldDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<FieldDetailResponse> {
    return this.fieldsService.update(id, dto, user)
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MEMBER)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser): Promise<void> {
    return this.fieldsService.remove(id, user)
  }

  @Post(':id/locations')
  @Roles(UserRole.ADMIN, UserRole.MEMBER)
  addLocation(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateLocationDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<FieldDetailResponse> {
    return this.fieldsService.addLocation(id, dto, user)
  }

  @Delete(':id/locations/:locationId')
  @Roles(UserRole.ADMIN, UserRole.MEMBER)
  removeLocation(
    @Param('id', ParseIntPipe) id: number,
    @Param('locationId', ParseIntPipe) locationId: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<FieldDetailResponse> {
    return this.fieldsService.removeLocation(id, locationId, user)
  }

  // Subdivisions can also be loaded by the producer on their own fields.
  @Post(':id/subdivisions')
  addSubdivision(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateSubdivisionDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<FieldDetailResponse> {
    return this.fieldsService.addSubdivision(id, dto, user)
  }

  @Patch(':id/subdivisions/:subdivisionId')
  updateSubdivision(
    @Param('id', ParseIntPipe) id: number,
    @Param('subdivisionId', ParseIntPipe) subdivisionId: number,
    @Body() dto: UpdateSubdivisionDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<FieldDetailResponse> {
    return this.fieldsService.updateSubdivision(id, subdivisionId, dto, user)
  }

  @Delete(':id/subdivisions/:subdivisionId')
  removeSubdivision(
    @Param('id', ParseIntPipe) id: number,
    @Param('subdivisionId', ParseIntPipe) subdivisionId: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<FieldDetailResponse> {
    return this.fieldsService.removeSubdivision(id, subdivisionId, user)
  }
}
