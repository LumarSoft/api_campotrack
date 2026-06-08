import { IsDateString, IsEnum, IsInt, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator'
import { Currency } from 'generated/prisma/client'

export class UpdateIncomeDto {
  @IsOptional()
  @IsInt()
  cropId?: number

  @IsOptional()
  @IsPositive()
  quantity?: number

  @IsOptional()
  @IsPositive()
  unitPrice?: number

  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency

  @IsOptional()
  @IsDateString()
  date?: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string
}
