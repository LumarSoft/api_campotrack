import { IsDateString, IsEnum, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator'
import { CostCategory, CostType, Currency } from 'generated/prisma/client'

export class UpdateCostDto {
  @IsOptional()
  @IsEnum(CostCategory)
  category?: CostCategory

  @IsOptional()
  @IsPositive()
  amount?: number

  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency

  @IsOptional()
  @IsDateString()
  date?: string

  @IsOptional()
  @IsEnum(CostType)
  costType?: CostType

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string
}
