import { Injectable } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'

/**
 * Protects routes that require a valid JWT. Apply with `@UseGuards(JwtAuthGuard)`
 * on any authenticated route (see security rules).
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
