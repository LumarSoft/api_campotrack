import { IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator'

export class CreateCropDto {
  @IsString()
  @MinLength(2)
  name: string

  // Optional sowing window (months 1-12) used by the recommendations.
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  sowingFromMonth?: number

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  sowingToMonth?: number
}
