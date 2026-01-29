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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ImageKitService } from '../imagekit/imagekit.service';
import { ItineraryService } from './itinerary.service';
import {
  CreateItineraryImageDto,
  UpdateItineraryImageDto,
} from './dto/itinerary-image.dto';
import {
  CurrentUserFull,
  CurrentUserData,
} from '../auth/decorators/current-user-full.decorator';

@Controller('itinerary')
@UseGuards(JwtAuthGuard)
export class ItineraryImageController {
  constructor(
    private imageKitService: ImageKitService,
    private itineraryService: ItineraryService,
  ) {}

  @Get('imagekit-auth')
  getImageKitAuth() {
    return this.imageKitService.getAuthenticationParameters();
  }

  @Post(':itineraryId/images')
  addImage(
    @Param('itineraryId') itineraryId: string,
    @CurrentUserFull() user: CurrentUserData,
    @Body() dto: CreateItineraryImageDto,
  ) {
    return this.itineraryService.addImage(
      itineraryId,
      user.userId,
      user.email,
      dto,
    );
  }

  @Get(':itineraryId/images')
  getImages(
    @Param('itineraryId') itineraryId: string,
    @CurrentUserFull() user: CurrentUserData,
  ) {
    return this.itineraryService.getImages(
      itineraryId,
      user.userId,
      user.email,
    );
  }

  @Put('images/:imageId')
  updateImage(
    @Param('imageId') imageId: string,
    @CurrentUserFull() user: CurrentUserData,
    @Body() dto: UpdateItineraryImageDto,
  ) {
    return this.itineraryService.updateImage(
      imageId,
      user.userId,
      user.email,
      dto,
    );
  }

  @Delete('images/:imageId')
  deleteImage(
    @Param('imageId') imageId: string,
    @CurrentUserFull() user: CurrentUserData,
  ) {
    return this.itineraryService.deleteImage(imageId, user.userId, user.email);
  }
}
