import { IsOptional, IsString, MinLength } from 'class-validator'

export class UpdateClientDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string

  @IsOptional()
  @IsString()
  contact?: string

  @IsOptional()
  @IsString()
  notes?: string
}
