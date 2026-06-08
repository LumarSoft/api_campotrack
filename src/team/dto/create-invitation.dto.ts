import { ArrayUnique, IsArray, IsEmail, IsIn, IsInt, IsOptional } from 'class-validator'
import { UserRole } from 'generated/prisma/client'

export class CreateInvitationDto {
  @IsEmail()
  email: string

  // Invitations only create members or producers, never another admin (info.md §3).
  @IsIn([UserRole.MEMBER, UserRole.PRODUCER])
  role: typeof UserRole.MEMBER | typeof UserRole.PRODUCER

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  fieldIds?: number[]
}
