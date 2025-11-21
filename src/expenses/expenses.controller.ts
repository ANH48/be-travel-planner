import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto, UpdateExpenseDto } from './dto/expense.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CurrentUserFull,
  CurrentUserData,
} from '../auth/decorators/current-user-full.decorator';

// Controller for trip expenses listing and creation
@Controller('trips/:tripId/expenses')
@UseGuards(JwtAuthGuard)
export class TripExpensesController {
  constructor(private expensesService: ExpensesService) {}

  @Post()
  create(
    @Param('tripId') tripId: string,
    @CurrentUserFull() user: CurrentUserData,
    @Body() dto: CreateExpenseDto,
  ) {
    return this.expensesService.create(tripId, user.userId, user.email, dto);
  }

  @Get()
  findAll(@Param('tripId') tripId: string) {
    return this.expensesService.findAll(tripId);
  }
}

// Controller for individual expense operations (matches API requirements)
@Controller('expenses')
@UseGuards(JwtAuthGuard)
export class ExpensesController {
  constructor(private expensesService: ExpensesService) {}

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.expensesService.findOneFormatted(id);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @CurrentUserFull() user: CurrentUserData,
    @Body() dto: UpdateExpenseDto,
  ) {
    return this.expensesService.update(id, user.userId, user.email, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUserFull() user: CurrentUserData) {
    return this.expensesService.remove(id, user.userId, user.email);
  }
}
