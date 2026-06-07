import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcrypt'
import { UserRole } from 'generated/prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { RegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'
import { UpdateProfileDto } from './dto/update-profile.dto'
import { AuthResponse, AuthUser, JwtPayload } from './auth.types'

const SALT_ROUNDS = 10

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } })
    if (existing) throw new ConflictException('There is already an account with this email')

    const hashedPassword = await bcrypt.hash(dto.password, SALT_ROUNDS)
    // Self-registration always creates the account owner (agrónomo) as ADMIN.
    // Members and producers join later by invitation (see info.md §3).
    const user = await this.prisma.user.create({
      data: { name: dto.name, email: dto.email, password: hashedPassword, role: UserRole.ADMIN },
      select: { id: true, email: true, name: true, role: true },
    })
    // The owner's account is itself; invited users inherit this id (info.md §2).
    await this.prisma.user.update({ where: { id: user.id }, data: { accountId: user.id } })

    return this.buildAuthResponse(user, user.id)
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true, email: true, name: true, role: true, password: true, accountId: true },
    })
    if (!user) throw new UnauthorizedException('Invalid credentials')

    const passwordMatches = await bcrypt.compare(dto.password, user.password)
    if (!passwordMatches) throw new UnauthorizedException('Invalid credentials')

    return this.buildAuthResponse(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      user.accountId ?? user.id,
    )
  }

  /** Issues a fresh session for an existing user (used after accepting an invitation). */
  async issueSession(userId: number): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true, accountId: true },
    })
    if (!user) throw new UnauthorizedException('User not found')
    return this.buildAuthResponse(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      user.accountId ?? user.id,
    )
  }

  async getProfile(userId: number): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true },
    })
    if (!user) throw new UnauthorizedException('Invalid credentials')
    return user
  }

  async updateProfile(userId: number, dto: UpdateProfileDto): Promise<AuthUser> {
    const data: { name?: string; password?: string } = {}
    if (dto.name !== undefined) data.name = dto.name
    if (dto.password !== undefined) data.password = await bcrypt.hash(dto.password, SALT_ROUNDS)

    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, email: true, name: true, role: true },
    })
  }

  private buildAuthResponse(user: AuthUser, accountId: number): AuthResponse {
    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role, accountId }
    const accessToken = this.jwt.sign(payload)
    return { accessToken, user }
  }
}
