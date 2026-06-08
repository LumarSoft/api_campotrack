import { IsArray, IsDateString, IsInt, IsObject, IsOptional, IsString } from 'class-validator'

export class UpdateRecordDto {
  @IsOptional()
  @IsInt()
  subdivisionId?: number

  @IsOptional()
  @IsDateString()
  recordDate?: string

  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[]

  @IsOptional()
  @IsDateString()
  clientUpdatedAt?: string
}
