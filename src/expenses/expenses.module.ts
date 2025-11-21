import { Module, forwardRef } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import {
  ExpensesController,
  TripExpensesController,
} from './expenses.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { SettlementsModule } from '../settlements/settlements.module';

@Module({
  imports: [PrismaModule, forwardRef(() => SettlementsModule)],
  controllers: [ExpensesController, TripExpensesController],
  providers: [ExpensesService],
  exports: [ExpensesService],
})
export class ExpensesModule {}
