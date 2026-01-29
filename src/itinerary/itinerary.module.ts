import { Module } from '@nestjs/common';
import { ItineraryController } from './itinerary.controller';
import { ItineraryService } from './itinerary.service';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

import { ItineraryImageController } from './itinerary-image.controller';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [ItineraryController, ItineraryImageController],
  providers: [ItineraryService],
  exports: [ItineraryService],
})
export class ItineraryModule {}
