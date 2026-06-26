import { Module } from '@nestjs/common';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { HouseholdsModule } from '../households/households.module';
import { LogModule } from '../log/log.module';

@Module({
  imports: [HouseholdsModule, LogModule],
  controllers: [TransactionsController],
  providers: [TransactionsService],
})
export class TransactionsModule {}
