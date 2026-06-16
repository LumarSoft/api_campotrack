import { IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator'

export class UpdateCropDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string

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
