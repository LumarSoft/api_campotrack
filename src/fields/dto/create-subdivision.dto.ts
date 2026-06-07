import { IsInt, IsPositive, IsString, MinLength } from 'class-validator'

export class CreateSubdivisionDto {
  // The location this subdivision belongs to — its area must be coherent with
  // the real surface of that location (info.md §6).
  @IsInt()
  locationId: number

  @IsString()
  @MinLength(2)
  name: string

  @IsPositive()
  ha: number
}
