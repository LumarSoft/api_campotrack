import { IsDateString, IsEnum, IsInt, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator'
import { Currency } from 'generated/prisma/client'

export class CreateQuoteDto {
  @IsInt()
  cropId: number

  @IsPositive()
  price: number

  @IsEnum(Currency)
  currency: Currency

  @IsDateString()
  date: string

  @IsOptional()
  @IsString()
  @MaxLength(60)
  source?: string
}
