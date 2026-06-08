import { UserRole } from 'generated/prisma/client'

/** Shape returned to the client on register/login. Never includes the password. */
export interface AuthUser {
  id: number
  email: string
  name: string | null
  role: UserRole
}

export interface AuthResponse {
  accessToken: string
  user: AuthUser
}

/** Decoded JWT payload signed by the auth service. */
export interface JwtPayload {
  sub: number
  email: string
  role: UserRole
  /** Account the user belongs to (the owning ADMIN's id). */
  accountId: number
}
