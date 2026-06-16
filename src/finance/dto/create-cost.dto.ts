import { IsDateString, IsEnum, IsInt, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator'
import { CostCategory, CostType, Currency } from 'generated/prisma/client'

export class CreateCostDto {
  @IsInt()
  campaignId: number

  // Optional supplier the cost was paid to (managed in the "Costos" section).
  @IsOptional()
  @IsInt()
  providerId?: number

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
