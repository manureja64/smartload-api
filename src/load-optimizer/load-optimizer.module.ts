import { Module } from '@nestjs/common';
import { LoadOptimizerController } from './load-optimizer.controller';
import { LoadOptimizerService } from './load-optimizer.service';

@Module({
  controllers: [LoadOptimizerController],
  providers: [LoadOptimizerService],
})
export class LoadOptimizerModule {}
