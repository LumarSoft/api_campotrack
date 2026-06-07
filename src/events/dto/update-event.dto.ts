import { ArrayUnique, IsArray, IsDateString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator'
import { AlarmType, EventStatus, EventType } from 'generated/prisma/client'

export class UpdateEventDto {
  @IsOptional()
  @IsEnum(EventType)
  type?: EventType

  @IsOptional()
  @IsDateString()
  plannedDate?: string

  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus

  @IsOptional()
  @IsDateString()
  actualDate?: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsEnum(AlarmType, { each: true })
  alarms?: AlarmType[]
}
