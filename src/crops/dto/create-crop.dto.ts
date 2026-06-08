import { IsString, MinLength } from 'class-validator'

export class CreateCropDto {
  @IsString()
  @MinLength(2)
  name: string
}
