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
import { ProvidersService, ProviderResponse } from './providers.service'
import { CreateProviderDto } from './dto/create-provider.dto'
import { UpdateProviderDto } from './dto/update-provider.dto'

// Suppliers / vendors. Managed by admin and members; producers do not manage
// cost-related catalogs (info.md §2 matrix).
@Controller('providers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProvidersController {
  constructor(private readonly providersService: ProvidersService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MEMBER)
  findAll(@CurrentUser() user: AuthenticatedUser): Promise<ProviderResponse[]> {
    return this.providersService.findAll(user)
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MEMBER)
  create(@Body() dto: CreateProviderDto, @CurrentUser() user: AuthenticatedUser): Promise<ProviderResponse> {
    return this.providersService.create(dto, user)
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MEMBER)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProviderDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ProviderResponse> {
    return this.providersService.update(id, dto, user)
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MEMBER)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser): Promise<void> {
    return this.providersService.remove(id, user)
  }
}
