import { IsLatitude, IsLongitude, IsOptional, IsPositive, IsString, MinLength } from 'class-validator'

export class CreateLocationDto {
  @IsString()
  @MinLength(2)
  locality: string

  @IsOptional()
  @IsLatitude()
  lat?: number

  @IsOptional()
  @IsLongitude()
  lng?: number

  @IsPositive()
  ha: number
}
