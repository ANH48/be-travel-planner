import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TripsService } from './trips.service';
import { CreateTripDto, UpdateTripDto } from './dto/trip.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  CurrentUserFull,
  CurrentUserData,
} from '../auth/decorators/current-user-full.decorator';

@Controller('trips')
@UseGuards(JwtAuthGuard)
export class TripsController {
  constructor(private tripsService: TripsService) {}

  @Post()
  create(@CurrentUserFull() user: CurrentUserData, @Body() dto: CreateTripDto) {
    return this.tripsService.create(user.userId, user.email, user.name, dto);
  }

  @Get()
  findAll(
    @CurrentUserFull() user: CurrentUserData,
    @Query('status') status?: string,
  ) {
    return this.tripsService.findAll(user.userId, user.email, status);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUserFull() user: CurrentUserData) {
    return this.tripsService.findOne(id, user.userId, user.email);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @CurrentUserFull() user: CurrentUserData,
    @Body() dto: UpdateTripDto,
  ) {
    return this.tripsService.update(id, user.userId, user.email, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUserFull() user: CurrentUserData) {
    return this.tripsService.remove(id, user.userId, user.email);
  }
}
