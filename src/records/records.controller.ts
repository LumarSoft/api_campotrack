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
  Query,
  UseGuards,
} from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy'
import { RecordsService, RecordResponse } from './records.service'
import { CreateRecordDto } from './dto/create-record.dto'
import { UpdateRecordDto } from './dto/update-record.dto'
import { ListRecordsDto } from './dto/list-records.dto'

// Operational field records (info.md §8). All roles log on the fields they
// access; edit/delete follows the admin > member rule. Offline-first: the
// client queues creations and flushes them here when back online.
@Controller('records')
@UseGuards(JwtAuthGuard)
export class RecordsController {
  constructor(private readonly recordsService: RecordsService) {}

  @Get()
  findAll(@Query() query: ListRecordsDto, @CurrentUser() user: AuthenticatedUser): Promise<RecordResponse[]> {
    return this.recordsService.findAll(query, user)
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser): Promise<RecordResponse> {
    return this.recordsService.findOne(id, user)
  }

  @Post()
  create(@Body() dto: CreateRecordDto, @CurrentUser() user: AuthenticatedUser): Promise<RecordResponse> {
    return this.recordsService.create(dto, user)
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRecordDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<RecordResponse> {
    return this.recordsService.update(id, dto, user)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser): Promise<void> {
    return this.recordsService.remove(id, user)
  }
}
