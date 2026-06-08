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
import { EventsService, EventResponse } from './events.service'
import { CreateEventDto } from './dto/create-event.dto'
import { UpdateEventDto } from './dto/update-event.dto'
import { PostponeEventDto } from './dto/postpone-event.dto'
import { ListEventsDto } from './dto/list-events.dto'

// Agronomic calendar events. All roles can manage events on the fields they
// access; edit/delete follows the admin > member rule (info.md §7).
@Controller('events')
@UseGuards(JwtAuthGuard)
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  findAll(@Query() query: ListEventsDto, @CurrentUser() user: AuthenticatedUser): Promise<EventResponse[]> {
    return this.eventsService.findAll(query, user)
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser): Promise<EventResponse> {
    return this.eventsService.findOne(id, user)
  }

  @Post()
  create(@Body() dto: CreateEventDto, @CurrentUser() user: AuthenticatedUser): Promise<EventResponse> {
    return this.eventsService.create(dto, user)
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEventDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<EventResponse> {
    return this.eventsService.update(id, dto, user)
  }

  @Post(':id/postpone')
  postpone(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PostponeEventDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<EventResponse> {
    return this.eventsService.postpone(id, dto, user)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser): Promise<void> {
    return this.eventsService.remove(id, user)
  }
}
