import { IsInt, IsOptional, IsPositive, IsString, MinLength } from 'class-validator'

export class CreateSubdivisionDto {
  // Lotes belong directly to the field; the sum of their areas cannot exceed the
  // field total (info.md §6). The location is optional, kept for compatibility.
  @IsOptional()
  @IsInt()
  locationId?: number

  @IsString()
  @MinLength(2)
  name: string

  @IsPositive()
  ha: number
}
