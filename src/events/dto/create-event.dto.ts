import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator'
import { AlarmType, EventType } from 'generated/prisma/client'

export class CreateEventDto {
  @IsInt()
  campaignId: number

  @IsOptional()
  @IsInt()
  subdivisionId?: number

  @IsEnum(EventType)
  type: EventType

  @IsDateString()
  plannedDate: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsEnum(AlarmType, { each: true })
  alarms?: AlarmType[]

  @IsOptional()
  @IsBoolean()
  suggestedBySystem?: boolean
}
