import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateItineraryDto, UpdateItineraryDto } from './dto/itinerary.dto';
import {
  canAccessTrip,
  getUserMemberId,
  canModifyItinerary,
} from '../common/helpers/trip-access.helper';
import { ImageKitService } from '../imagekit/imagekit.service';
import {
  CreateItineraryImageDto,
  UpdateItineraryImageDto,
} from './dto/itinerary-image.dto';

@Injectable()
export class ItineraryService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private imageKitService: ImageKitService,
  ) {}

  async create(
    tripId: string,
    userId: string,
    userEmail: string,
    dto: CreateItineraryDto,
  ) {
    // Verify trip exists and user has access
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: { members: true },
    });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    const { canAccess } = canAccessTrip(userId, userEmail, trip);
    if (!canAccess) {
      throw new ForbiddenException('You do not have access to this trip');
    }

    // Get current user's member ID
    const createdById = getUserMemberId(userEmail, trip.members);
    if (!createdById) {
      throw new BadRequestException(
        'You must be a member of the trip to add itinerary items',
      );
    }

    // Validate date is within trip dates
    const activityDate = new Date(dto.date);
    if (activityDate < trip.startDate || activityDate > trip.endDate) {
      throw new BadRequestException(
        'Itinerary date must be within trip start and end dates',
      );
    }

    // Validate endTime is after startTime if provided
    if (dto.endTime && dto.startTime >= dto.endTime) {
      throw new BadRequestException('endTime must be after startTime');
    }

    const itineraryItem = await this.prisma.itineraryItem.create({
      data: {
        tripId,
        createdById,
        date: new Date(dto.date),
        startTime: dto.startTime,
        endTime: dto.endTime,
        activity: dto.activity,
        location: dto.location,
        category: dto.category,
        description: dto.description,
      },
    });

    // Send notifications to all trip members except the creator
    const tripMembers = await this.prisma.tripMember.findMany({
      where: { tripId, userId: { not: null } }, // Only notify registered users
    });

    // Get the creator's userId directly from the TripMember
    const creatorMember = await this.prisma.tripMember.findUnique({
      where: { id: createdById },
    });
    const creatorUserId = creatorMember?.userId;

    for (const member of tripMembers) {
      if (member.userId && member.userId !== creatorUserId) {
        await this.notificationsService.createNotification(
          member.userId,
          'ITINERARY_ADDED',
          'New Activity Added',
          `${creatorMember?.name || 'Someone'} added a new activity: ${dto.activity}${dto.location ? ` at ${dto.location}` : ''}`,
          {
            tripId,
            tripName: trip.name,
            itineraryId: itineraryItem.id,
            activity: dto.activity,
            location: dto.location,
            date: dto.date,
            startTime: dto.startTime,
            createdBy: creatorMember?.name,
          },
        );
      }
    }

    return itineraryItem;
  }

  async findAll(tripId: string) {
    // Verify trip exists
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
    });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    return this.prisma.itineraryItem.findMany({
      where: { tripId },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });
  }

  async findOne(id: string) {
    const itinerary = await this.prisma.itineraryItem.findUnique({
      where: { id },
    });

    if (!itinerary) {
      throw new NotFoundException('Itinerary item not found');
    }

    return itinerary;
  }

  async update(
    id: string,
    userId: string,
    userEmail: string,
    dto: UpdateItineraryDto,
  ) {
    const itinerary = await this.prisma.itineraryItem.findUnique({
      where: { id },
      include: {
        trip: {
          include: { members: true },
        },
      },
    });

    if (!itinerary) {
      throw new NotFoundException('Itinerary item not found');
    }

    // Check trip access
    const { canAccess } = canAccessTrip(userId, userEmail, itinerary.trip);
    if (!canAccess) {
      throw new ForbiddenException('You do not have access to this trip');
    }

    // Check ownership - only trip creator or item creator can modify
    const canModify = canModifyItinerary(userId, userEmail, itinerary.trip, itinerary.createdById);
    if (!canModify) {
      throw new ForbiddenException('You can only modify itinerary items you created');
    }

    // Validate date is within trip dates if provided
    if (dto.date) {
      const activityDate = new Date(dto.date);
      if (
        activityDate < itinerary.trip.startDate ||
        activityDate > itinerary.trip.endDate
      ) {
        throw new BadRequestException(
          'Itinerary date must be within trip start and end dates',
        );
      }
    }

    // Validate endTime is after startTime
    const startTime = dto.startTime || itinerary.startTime;
    const endTime = dto.endTime || itinerary.endTime;
    if (endTime && startTime >= endTime) {
      throw new BadRequestException('endTime must be after startTime');
    }

    return this.prisma.itineraryItem.update({
      where: { id },
      data: {
        ...(dto.date && { date: new Date(dto.date) }),
        ...(dto.startTime && { startTime: dto.startTime }),
        ...(dto.endTime !== undefined && { endTime: dto.endTime }),
        ...(dto.activity && { activity: dto.activity }),
        ...(dto.location !== undefined && { location: dto.location }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.description !== undefined && { description: dto.description }),
      },
    });
  }

  async remove(id: string, userId: string, userEmail: string) {
    const itinerary = await this.prisma.itineraryItem.findUnique({
      where: { id },
      include: {
        trip: {
          include: { members: true },
        },
      },
    });

    if (!itinerary) {
      throw new NotFoundException('Itinerary item not found');
    }

    // Check trip access
    const { canAccess } = canAccessTrip(userId, userEmail, itinerary.trip);
    if (!canAccess) {
      throw new ForbiddenException('You do not have access to this trip');
    }

    // Check ownership - only trip creator or item creator can delete
    const canModify = canModifyItinerary(userId, userEmail, itinerary.trip, itinerary.createdById);
    if (!canModify) {
      throw new ForbiddenException('You can only delete itinerary items you created');
    }

    // Delete images from ImageKit first
    await this.deleteAllImages(id);

    await this.prisma.itineraryItem.delete({
      where: { id },
    });

    return { message: 'Itinerary item deleted successfully' };
  }

  /**
   * Delete all images for an itinerary (called before itinerary delete)
   * Note: Prisma cascade handles DB cleanup; this cleans ImageKit
   */
  async deleteAllImages(itineraryId: string): Promise<void> {
    const images = await this.prisma.itineraryImage.findMany({
      where: { itineraryId },
      select: { imageKitFileId: true },
    });

    // Delete from ImageKit in parallel
    await Promise.all(
      images.map((img) => this.imageKitService.deleteFile(img.imageKitFileId)),
    );
  }

  /**
   * Add image to itinerary item
   */
  async addImage(
    itineraryId: string,
    userId: string,
    userEmail: string,
    dto: CreateItineraryImageDto,
  ) {
    const itinerary = await this.prisma.itineraryItem.findUnique({
      where: { id: itineraryId },
      include: {
        trip: { include: { members: true } },
      },
    });

    if (!itinerary) {
      throw new NotFoundException('Itinerary item not found');
    }

    // Check trip access
    const { canAccess } = canAccessTrip(userId, userEmail, itinerary.trip);
    if (!canAccess) {
      throw new ForbiddenException('You do not have access to this trip');
    }

    // Check modify permission
    const canModify = canModifyItinerary(
      userId,
      userEmail,
      itinerary.trip,
      itinerary.createdById,
    );
    if (!canModify) {
      throw new ForbiddenException(
        'Only the trip owner or itinerary creator can add images',
      );
    }

    // Get uploader's member ID
    const uploadedById = getUserMemberId(userEmail, itinerary.trip.members);
    if (!uploadedById) {
      throw new BadRequestException('You must be a trip member to add images');
    }

    // Enforce 10-image limit per itinerary
    const MAX_IMAGES_PER_ITINERARY = 10;
    const currentImageCount = await this.prisma.itineraryImage.count({
      where: { itineraryId },
    });
    if (currentImageCount >= MAX_IMAGES_PER_ITINERARY) {
      throw new BadRequestException(
        `Maximum ${MAX_IMAGES_PER_ITINERARY} images allowed per itinerary item`,
      );
    }

    // Get next display order if not provided
    let displayOrder = dto.displayOrder;
    if (displayOrder === undefined) {
      const maxOrder = await this.prisma.itineraryImage.aggregate({
        where: { itineraryId },
        _max: { displayOrder: true },
      });
      displayOrder = (maxOrder._max.displayOrder ?? -1) + 1;
    }

    return this.prisma.itineraryImage.create({
      data: {
        itineraryId,
        imageUrl: dto.imageUrl,
        imageKitFileId: dto.imageKitFileId,
        caption: dto.caption,
        displayOrder,
        uploadedById,
      },
    });
  }

  /**
   * Get all images for an itinerary item
   */
  async getImages(itineraryId: string, userId: string, userEmail: string) {
    const itinerary = await this.prisma.itineraryItem.findUnique({
      where: { id: itineraryId },
      include: {
        trip: { include: { members: true } },
      },
    });

    if (!itinerary) {
      throw new NotFoundException('Itinerary item not found');
    }

    // Check trip access (any member can view)
    const { canAccess } = canAccessTrip(userId, userEmail, itinerary.trip);
    if (!canAccess) {
      throw new ForbiddenException('You do not have access to this trip');
    }

    return this.prisma.itineraryImage.findMany({
      where: { itineraryId },
      orderBy: { displayOrder: 'asc' },
      include: {
        uploadedBy: {
          select: { id: true, name: true },
        },
      },
    });
  }

  /**
   * Update image caption or order
   */
  async updateImage(
    imageId: string,
    userId: string,
    userEmail: string,
    dto: UpdateItineraryImageDto,
  ) {
    const image = await this.prisma.itineraryImage.findUnique({
      where: { id: imageId },
      include: {
        itinerary: {
          include: {
            trip: { include: { members: true } },
          },
        },
      },
    });

    if (!image) {
      throw new NotFoundException('Image not found');
    }

    // Check trip access
    const { canAccess } = canAccessTrip(
      userId,
      userEmail,
      image.itinerary.trip,
    );
    if (!canAccess) {
      throw new ForbiddenException('You do not have access to this trip');
    }

    // Check modify permission
    const canModify = canModifyItinerary(
      userId,
      userEmail,
      image.itinerary.trip,
      image.itinerary.createdById,
    );
    if (!canModify) {
      throw new ForbiddenException(
        'Only the trip owner or itinerary creator can update images',
      );
    }

    return this.prisma.itineraryImage.update({
      where: { id: imageId },
      data: {
        ...(dto.caption !== undefined && { caption: dto.caption }),
        ...(dto.displayOrder !== undefined && { displayOrder: dto.displayOrder }),
      },
    });
  }

  /**
   * Delete image from DB and ImageKit
   */
  async deleteImage(imageId: string, userId: string, userEmail: string) {
    const image = await this.prisma.itineraryImage.findUnique({
      where: { id: imageId },
      include: {
        itinerary: {
          include: {
            trip: { include: { members: true } },
          },
        },
      },
    });

    if (!image) {
      throw new NotFoundException('Image not found');
    }

    // Check trip access
    const { canAccess } = canAccessTrip(
      userId,
      userEmail,
      image.itinerary.trip,
    );
    if (!canAccess) {
      throw new ForbiddenException('You do not have access to this trip');
    }

    // Check modify permission
    const canModify = canModifyItinerary(
      userId,
      userEmail,
      image.itinerary.trip,
      image.itinerary.createdById,
    );
    if (!canModify) {
      throw new ForbiddenException(
        'Only the trip owner or itinerary creator can delete images',
      );
    }

    // Delete from ImageKit (soft fail)
    await this.imageKitService.deleteFile(image.imageKitFileId);

    // Delete from database
    await this.prisma.itineraryImage.delete({
      where: { id: imageId },
    });

    return { message: 'Image deleted successfully' };
  }
}
