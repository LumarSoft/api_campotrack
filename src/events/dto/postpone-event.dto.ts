import { IsDateString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator'
import { PostponementCause } from 'generated/prisma/client'

export class PostponeEventDto {
  @IsDateString()
  newDate: string

  @IsEnum(PostponementCause)
  cause: PostponementCause

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string
}
