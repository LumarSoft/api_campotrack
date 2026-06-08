import { IsDateString, IsEnum, IsInt, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator'
import { Currency } from 'generated/prisma/client'

export class CreateIncomeDto {
  @IsInt()
  campaignId: number

  @IsInt()
  cropId: number

  @IsPositive()
  quantity: number

  @IsPositive()
  unitPrice: number

  @IsEnum(Currency)
  currency: Currency

  @IsDateString()
  date: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string
}
