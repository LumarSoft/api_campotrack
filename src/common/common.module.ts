import { Global, Module } from '@nestjs/common'
import { ScopeService } from './scope.service'

/** Shared cross-cutting providers (account/field scoping), available app-wide. */
@Global()
@Module({
  providers: [ScopeService],
  exports: [ScopeService],
})
export class CommonModule {}
