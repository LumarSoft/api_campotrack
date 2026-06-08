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
import { UserRole } from 'generated/prisma/client'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy'
import { Roles } from '../common/roles.decorator'
import { RolesGuard } from '../common/roles.guard'
import { FinanceService, CostResponse, IncomeResponse, QuoteResponse } from './finance.service'
import { CreateCostDto } from './dto/create-cost.dto'
import { UpdateCostDto } from './dto/update-cost.dto'
import { CreateIncomeDto } from './dto/create-income.dto'
import { UpdateIncomeDto } from './dto/update-income.dto'
import { CreateQuoteDto } from './dto/create-quote.dto'
import { ListFinanceDto } from './dto/list-finance.dto'

// Finance & profitability (info.md §9). Hidden from the producer: admins and
// members only. Account/field scoping is enforced in the service.
@Controller('finance')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MEMBER)
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('costs')
  findCosts(@Query() query: ListFinanceDto, @CurrentUser() user: AuthenticatedUser): Promise<CostResponse[]> {
    return this.financeService.findCosts(query, user)
  }

  @Post('costs')
  createCost(@Body() dto: CreateCostDto, @CurrentUser() user: AuthenticatedUser): Promise<CostResponse> {
    return this.financeService.createCost(dto, user)
  }

  @Patch('costs/:id')
  updateCost(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCostDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CostResponse> {
    return this.financeService.updateCost(id, dto, user)
  }

  @Delete('costs/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeCost(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser): Promise<void> {
    return this.financeService.removeCost(id, user)
  }

  @Get('incomes')
  findIncomes(@Query() query: ListFinanceDto, @CurrentUser() user: AuthenticatedUser): Promise<IncomeResponse[]> {
    return this.financeService.findIncomes(query, user)
  }

  @Post('incomes')
  createIncome(@Body() dto: CreateIncomeDto, @CurrentUser() user: AuthenticatedUser): Promise<IncomeResponse> {
    return this.financeService.createIncome(dto, user)
  }

  @Patch('incomes/:id')
  updateIncome(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateIncomeDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<IncomeResponse> {
    return this.financeService.updateIncome(id, dto, user)
  }

  @Delete('incomes/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeIncome(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser): Promise<void> {
    return this.financeService.removeIncome(id, user)
  }

  @Get('quotes')
  findQuotes(@CurrentUser() user: AuthenticatedUser): Promise<QuoteResponse[]> {
    return this.financeService.findQuotes(user)
  }

  @Post('quotes')
  createQuote(@Body() dto: CreateQuoteDto, @CurrentUser() user: AuthenticatedUser): Promise<QuoteResponse> {
    return this.financeService.createQuote(dto, user)
  }

  @Delete('quotes/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeQuote(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser): Promise<void> {
    return this.financeService.removeQuote(id, user)
  }
}
