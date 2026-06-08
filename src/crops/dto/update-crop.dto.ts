import { IsString, MinLength } from 'class-validator'

export class UpdateCropDto {
  @IsString()
  @MinLength(2)
  name: string
}
