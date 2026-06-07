import { ArrayUnique, IsArray, IsInt, IsOptional, IsPositive, IsString, MinLength } from 'class-validator'

export class CreateFieldDto {
  @IsString()
  @MinLength(2)
  name: string

  @IsPositive()
  totalHa: number

  // Clients this field belongs to (a field can belong to several — info.md §6).
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  clientIds?: number[]
}
