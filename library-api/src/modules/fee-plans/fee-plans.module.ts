import { Module } from '@nestjs/common';
import { FeePlansService } from './fee-plans.service';
import { FeePlansController } from './fee-plans.controller';

@Module({
  controllers: [FeePlansController],
  providers: [FeePlansService],
  exports: [FeePlansService],
})
export class FeePlansModule {}
