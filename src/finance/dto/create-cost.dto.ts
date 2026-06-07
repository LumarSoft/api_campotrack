import { IsDateString, IsEnum, IsInt, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator'
import { CostCategory, CostType, Currency } from 'generated/prisma/client'

export class CreateCostDto {
  @IsInt()
  campaignId: number

  @IsEnum(CostCategory)
  category: CostCategory

  @IsPositive()
  amount: number

  @IsEnum(Currency)
  currency: Currency

  @IsDateString()
  date: string

  @IsOptional()
  @IsEnum(CostType)
  costType?: CostType

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string
}
