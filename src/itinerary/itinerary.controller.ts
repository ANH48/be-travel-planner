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
import { ItineraryService } from './itinerary.service';
import { CreateItineraryDto, UpdateItineraryDto } from './dto/itinerary.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CurrentUserFull,
  CurrentUserData,
} from '../auth/decorators/current-user-full.decorator';

@Controller('trips/:tripId/itinerary')
@UseGuards(JwtAuthGuard)
export class ItineraryController {
  constructor(private itineraryService: ItineraryService) {}

  @Post()
  create(
    @Param('tripId') tripId: string,
    @CurrentUserFull() user: CurrentUserData,
    @Body() dto: CreateItineraryDto,
  ) {
    return this.itineraryService.create(tripId, user.userId, user.email, dto);
  }

  @Get()
  findAll(@Param('tripId') tripId: string) {
    return this.itineraryService.findAll(tripId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.itineraryService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @CurrentUserFull() user: CurrentUserData,
    @Body() dto: UpdateItineraryDto,
  ) {
    return this.itineraryService.update(id, user.userId, user.email, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUserFull() user: CurrentUserData) {
    return this.itineraryService.remove(id, user.userId, user.email);
  }
}
