import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcrypt'
import { PrismaService } from '../prisma/prisma.service'
import { RegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'
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
    const user = await this.prisma.user.create({
      data: { name: dto.name, email: dto.email, password: hashedPassword },
      select: { id: true, email: true, name: true },
    })

    return this.buildAuthResponse(user)
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true, email: true, name: true, password: true },
    })
    if (!user) throw new UnauthorizedException('Invalid credentials')

    const passwordMatches = await bcrypt.compare(dto.password, user.password)
    if (!passwordMatches) throw new UnauthorizedException('Invalid credentials')

    return this.buildAuthResponse({ id: user.id, email: user.email, name: user.name })
  }

  async getProfile(userId: number): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    })
    if (!user) throw new UnauthorizedException('Invalid credentials')
    return user
  }

  private buildAuthResponse(user: AuthUser): AuthResponse {
    const payload: JwtPayload = { sub: user.id, email: user.email }
    const accessToken = this.jwt.sign(payload)
    return { accessToken, user }
  }
}
