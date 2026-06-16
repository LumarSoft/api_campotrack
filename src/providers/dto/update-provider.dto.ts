import { IsOptional, IsString, MinLength } from 'class-validator'

export class UpdateProviderDto {
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
