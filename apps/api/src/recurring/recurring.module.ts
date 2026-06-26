import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { HouseholdsModule } from '../households/households.module';
import { LogModule } from '../log/log.module';
import { RecurringController } from './recurring.controller';
import { RecurringService } from './recurring.service';

@Module({
  imports: [PrismaModule, HouseholdsModule, LogModule],
  controllers: [RecurringController],
  providers: [RecurringService],
})
export class RecurringModule {}
