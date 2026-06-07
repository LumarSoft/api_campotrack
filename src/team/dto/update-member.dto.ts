import { ArrayUnique, IsArray, IsIn, IsInt, IsOptional } from 'class-validator'
import { UserRole } from 'generated/prisma/client'

export class UpdateMemberDto {
  @IsOptional()
  @IsIn([UserRole.MEMBER, UserRole.PRODUCER])
  role?: typeof UserRole.MEMBER | typeof UserRole.PRODUCER

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  fieldIds?: number[]
}
