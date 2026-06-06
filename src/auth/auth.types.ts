/** Shape returned to the client on register/login. Never includes the password. */
export interface AuthUser {
  id: number
  email: string
  name: string | null
}

export interface AuthResponse {
  accessToken: string
  user: AuthUser
}

/** Decoded JWT payload signed by the auth service. */
export interface JwtPayload {
  sub: number
  email: string
}
