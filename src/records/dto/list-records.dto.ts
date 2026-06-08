import { Type } from 'class-transformer'
import { IsEnum, IsInt, IsOptional } from 'class-validator'
import { RecordSubtype } from 'generated/prisma/client'

export class ListRecordsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  campaignId?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  fieldId?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  subdivisionId?: number

  @IsOptional()
  @IsEnum(RecordSubtype)
  subtype?: RecordSubtype
}
