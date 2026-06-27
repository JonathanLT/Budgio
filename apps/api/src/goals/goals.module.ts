import { Module } from '@nestjs/common';
import { GoalsController } from './goals.controller';
import { GoalsService } from './goals.service';
import { HouseholdsModule } from '../households/households.module';
import { LogModule } from '../log/log.module';

@Module({
  imports: [HouseholdsModule, LogModule],
  controllers: [GoalsController],
  providers: [GoalsService],
})
export class GoalsModule {}
