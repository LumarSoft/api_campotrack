import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { TeamController, PublicInvitationsController } from './team.controller'
import { TeamService } from './team.service'

@Module({
  imports: [AuthModule],
  controllers: [TeamController, PublicInvitationsController],
  providers: [TeamService],
})
export class TeamModule {}
