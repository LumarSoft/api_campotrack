import { IsArray, IsDateString, IsEnum, IsInt, IsObject, IsOptional, IsString } from 'class-validator'
import { RecordSubtype } from 'generated/prisma/client'

export class CreateRecordDto {
  @IsEnum(RecordSubtype)
  subtype: RecordSubtype

  @IsInt()
  campaignId: number

  @IsOptional()
  @IsInt()
  subdivisionId?: number

  @IsDateString()
  recordDate: string

  // Subtype-specific payload — validated and whitelisted in the service.
  @IsObject()
  data: Record<string, unknown>

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[]

  // When the record was last edited on the client (offline sync, LWW).
  @IsOptional()
  @IsDateString()
  clientUpdatedAt?: string
}
