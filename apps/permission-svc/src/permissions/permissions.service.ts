import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisCacheService } from '../cache/redis-cache.service';
import { Trip, TripMember } from '@prisma/client-permission';
import {
  canAccessTrip,
  canModifyTrip,
  canModifyExpense,
  canModifyItinerary,
  getUserMemberId,
} from '../common/helpers/trip-access.helper';

type TripWithMembers = Trip & { members: TripMember[] };

@Injectable()
export class PermissionsService {
  private readonly logger = new Logger(PermissionsService.name);

  constructor(
    private prisma: PrismaService,
    private cache: RedisCacheService,
  ) {}

  async checkTripAccess(
    userId: string,
    userEmail: string,
    tripId: string,
  ) {
    const trip = await this.getTripFromCacheOrDb(tripId);
    
    if (!trip) {
      this.logger.warn(`Trip not found: ${tripId}`);
      return { can_access: false, role: '' };
    }

    const result = canAccessTrip(userId, userEmail, trip);
    return {
      can_access: result.canAccess,
      role: result.role || '',
    };
  }

  async checkTripModify(userId: string, tripId: string) {
    const trip = await this.getTripFromCacheOrDb(tripId);
    if (!trip) {
      return { can_modify: false };
    }
    const canModify = canModifyTrip(userId, trip);
    return { can_modify: canModify };
  }

  async checkExpenseModify(
    userId: string,
    userEmail: string,
    tripId: string,
    expenseCreatorId?: string,
  ): Promise<boolean> {
    const trip = await this.getTripFromCacheOrDb(tripId);
    if (!trip) return false;
    return canModifyExpense(userId, userEmail, trip, expenseCreatorId);
  }

  async checkItineraryModify(
    userId: string,
    userEmail: string,
    tripId: string,
    itineraryCreatorId?: string,
  ): Promise<boolean> {
    const trip = await this.getTripFromCacheOrDb(tripId);
    if (!trip) return false;
    return canModifyItinerary(userId, userEmail, trip, itineraryCreatorId);
  }

  async getUserMemberId(
    userEmail: string,
    tripId: string,
  ): Promise<string | null> {
    const trip = await this.getTripFromCacheOrDb(tripId);
    if (!trip) return null;
    return getUserMemberId(userEmail, trip.members);
  }

  private async getTripFromCacheOrDb(tripId: string): Promise<TripWithMembers | null> {
    const cacheKey = `trip:${tripId}`;

    // Try cache first
    let trip = await this.cache.get<TripWithMembers>(cacheKey);

    if (!trip) {
      // Fetch from database
      trip = await this.prisma.trip.findUnique({
        where: { id: tripId },
        include: { members: true },
      });

      if (trip) {
        // Cache for 5 minutes (300 seconds)
        await this.cache.set(cacheKey, trip, 300);
        this.logger.debug(`Trip ${tripId} cached from database`);
      }
    } else {
      this.logger.debug(`Trip ${tripId} retrieved from cache`);
    }

    return trip;
  }
}
