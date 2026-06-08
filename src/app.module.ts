import { Module } from '@nestjs/common'
import { APP_INTERCEPTOR } from '@nestjs/core'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { PrismaModule } from './prisma/prisma.module'
import { CommonModule } from './common/common.module'
import { AuditInterceptor } from './common/audit.interceptor'
import { AuthModule } from './auth/auth.module'
import { CropsModule } from './crops/crops.module'
import { ClientsModule } from './clients/clients.module'
import { FieldsModule } from './fields/fields.module'
import { CampaignsModule } from './campaigns/campaigns.module'
import { EventsModule } from './events/events.module'
import { RecordsModule } from './records/records.module'
import { TeamModule } from './team/team.module'
import { AuditModule } from './audit/audit.module'
import { FinanceModule } from './finance/finance.module'

@Module({
  imports: [
    PrismaModule,
    CommonModule,
    AuthModule,
    CropsModule,
    ClientsModule,
    FieldsModule,
    CampaignsModule,
    EventsModule,
    RecordsModule,
    TeamModule,
    AuditModule,
    FinanceModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_INTERCEPTOR, useClass: AuditInterceptor }],
})
export class AppModule {}
