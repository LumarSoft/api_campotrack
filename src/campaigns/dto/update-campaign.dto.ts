import { IsDateString, IsInt, IsOptional, IsPositive, IsString, MinLength } from 'class-validator'

export class UpdateCampaignDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  cycle?: string

  @IsOptional()
  @IsInt()
  cropId?: number

  @IsOptional()
  @IsDateString()
  sowingDateEst?: string

  @IsOptional()
  @IsDateString()
  harvestDateEst?: string

  @IsOptional()
  @IsDateString()
  endDateEst?: string

  @IsOptional()
  @IsPositive()
  ha?: number
}
