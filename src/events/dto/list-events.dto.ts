import { Type } from 'class-transformer'
import { IsDateString, IsEnum, IsInt, IsOptional } from 'class-validator'
import { EventType } from 'generated/prisma/client'

export class ListEventsDto {
  @IsOptional()
  @IsDateString()
  from?: string

  @IsOptional()
  @IsDateString()
  to?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  fieldId?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  campaignId?: number

  @IsOptional()
  @IsEnum(EventType)
  type?: EventType
}
