import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';
import { LoadOptimizerModule } from './load-optimizer/load-optimizer.module';

@Module({
  imports: [HealthModule, LoadOptimizerModule],
})
export class AppModule {}
