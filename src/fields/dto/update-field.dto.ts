import { ArrayUnique, IsArray, IsInt, IsOptional, IsPositive, IsString, MinLength } from 'class-validator'

export class UpdateFieldDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string

  @IsOptional()
  @IsPositive()
  totalHa?: number

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  clientIds?: number[]
}
