import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { UserRole } from 'generated/prisma/client'
import { JwtPayload } from '../auth.types'

export interface AuthenticatedUser {
  id: number
  email: string
  role: UserRole
  /** Account the user belongs to (the owning ADMIN's id). */
  accountId: number
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    const secret = process.env.JWT_SECRET
    if (!secret) throw new UnauthorizedException('Authentication is not configured')

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    })
  }

  validate(payload: JwtPayload): AuthenticatedUser {
    return { id: payload.sub, email: payload.email, role: payload.role, accountId: payload.accountId }
  }
}
