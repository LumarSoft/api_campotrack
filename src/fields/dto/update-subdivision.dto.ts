import { IsInt, IsOptional, IsPositive, IsString, MinLength } from 'class-validator'

export class UpdateSubdivisionDto {
  @IsOptional()
  @IsInt()
  locationId?: number

  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string

  @IsOptional()
  @IsPositive()
  ha?: number
}
