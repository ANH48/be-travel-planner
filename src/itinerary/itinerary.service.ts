import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateItineraryDto, UpdateItineraryDto } from './dto/itinerary.dto';
import {
  canAccessTrip,
  getUserMemberId,
  canModifyItinerary,
} from '../common/helpers/trip-access.helper';

@Injectable()
export class ItineraryService {
  constructor(private prisma: PrismaService) {}

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

    return this.prisma.itineraryItem.create({
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

    await this.prisma.itineraryItem.delete({
      where: { id },
    });

    return { message: 'Itinerary item deleted successfully' };
  }
}
