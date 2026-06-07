import { IsDateString, IsInt, IsOptional, IsPositive, IsString, MinLength } from 'class-validator'

export class CreateCampaignDto {
  // A campaign is attached either to a whole field or to a single subdivision.
  @IsOptional()
  @IsInt()
  fieldId?: number

  @IsOptional()
  @IsInt()
  subdivisionId?: number

  @IsString()
  @MinLength(2)
  cycle: string

  @IsInt()
  cropId: number

  @IsOptional()
  @IsDateString()
  sowingDateEst?: string

  @IsOptional()
  @IsDateString()
  harvestDateEst?: string

  @IsPositive()
  ha: number
}
