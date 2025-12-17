import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTripDto, UpdateTripDto } from './dto/trip.dto';
import { TripStatus } from '@prisma/client';
import { PermissionGrpcClient } from '../grpc-clients/permission-grpc.client';

@Injectable()
export class TripsService {
  constructor(
    private prisma: PrismaService,
    private permissionClient: PermissionGrpcClient,
  ) {}

  private calculateTripStatus(startDate: Date, endDate: Date): TripStatus {
    const now = new Date();
    
    if (now < startDate) {
      return TripStatus.UPCOMING;
    } else if (now >= startDate && now <= endDate) {
      return TripStatus.ONGOING;
    } else {
      return TripStatus.COMPLETED;
    }
  }

  async create(userId: string, userEmail: string, userName: string, dto: CreateTripDto) {
    // Verify user exists in database
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found. Please login again.');
    }

    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    const status = this.calculateTripStatus(startDate, endDate);

    // Create trip and automatically add creator as a member
    return this.prisma.trip.create({
      data: {
        name: dto.name,
        description: dto.description,
        location: dto.location,
        startDate,
        endDate,
        status,
        ownerId: userId,
        members: {
          create: {
            name: userName,
            email: userEmail,
            userId: userId,
          },
        },
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        members: true,
      },
    });
  }

  async findAll(userId: string, userEmail: string, status?: string) {
    // Find trips where user is creator OR member
    const where: any = {
      OR: [
        { ownerId: userId }, // Trips created by user
        {
          members: {
            some: {
              email: {
                equals: userEmail,
                mode: 'insensitive', // Case-insensitive match
              },
            },
          },
        }, // Trips user is member of
      ],
    };

    if (status) {
      where.status = status;
    }

    const trips = await this.prisma.trip.findMany({
      where,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        members: true,
        _count: {
          select: {
            members: true,
            expenses: true,
          },
        },
      },
      orderBy: {
        startDate: 'desc',
      },
    });

    // Auto-update status and add role field
    const updatedTrips = await Promise.all(
      trips.map(async (trip) => {
        const calculatedStatus = this.calculateTripStatus(
          trip.startDate,
          trip.endDate,
        );

        // Update if status changed
        if (trip.status !== calculatedStatus) {
          await this.prisma.trip.update({
            where: { id: trip.id },
            data: { status: calculatedStatus },
          });
        }

        // Determine user's role in this trip
        const role = trip.ownerId === userId ? 'creator' : 'member';

        return {
          ...trip,
          status: calculatedStatus,
          role, // Add role to response
        };
      }),
    );

    return updatedTrips;
  }

  async findOne(id: string, userId: string, userEmail: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        members: true,
        expenses: {
          include: {
            payer: true,
            splits: {
              include: {
                member: true,
              },
            },
          },
          orderBy: {
            expenseDate: 'desc',
          },
        },
        _count: {
          select: {
            members: true,
            expenses: true,
          },
        },
      },
    });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    // Check access using Permission Service
    const accessCheck = await this.permissionClient.checkTripAccess(userId, userEmail, id);

    if (!accessCheck.can_access) {
      throw new ForbiddenException('You do not have access to this trip');
    }

    const role = accessCheck.role;

    // Auto-update status if needed
    const calculatedStatus = this.calculateTripStatus(
      trip.startDate,
      trip.endDate,
    );
    if (trip.status !== calculatedStatus) {
      await this.prisma.trip.update({
        where: { id },
        data: { status: calculatedStatus },
      });
      trip.status = calculatedStatus;
    }

    return {
      ...trip,
      role, // Add role to response
    };
  }

  async update(id: string, userId: string, userEmail: string, dto: UpdateTripDto) {
    const trip = await this.findOne(id, userId, userEmail);

    // Only creator can modify trip using Permission Service
    const modifyCheck = await this.permissionClient.checkTripModify(userId, id);

    if (!modifyCheck.can_modify) {
      throw new ForbiddenException('Only trip creator can update trip details');
    }

    const updateData: any = {
      name: dto.name,
      description: dto.description,
      location: dto.location,
      status: dto.status,
    };

    // Update dates if provided
    if (dto.startDate) {
      updateData.startDate = new Date(dto.startDate);
    }
    if (dto.endDate) {
      updateData.endDate = new Date(dto.endDate);
    }

    // If dates changed, recalculate status (unless manually set)
    if ((dto.startDate || dto.endDate) && !dto.status) {
      const tripData = await this.prisma.trip.findUnique({ where: { id } });
      const startDate = dto.startDate
        ? new Date(dto.startDate)
        : tripData!.startDate;
      const endDate = dto.endDate ? new Date(dto.endDate) : tripData!.endDate;
      updateData.status = this.calculateTripStatus(startDate, endDate);
    }

    return this.prisma.trip.update({
      where: { id },
      data: updateData,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async remove(id: string, userId: string, userEmail: string) {
    const trip = await this.findOne(id, userId, userEmail);

    // Only creator can delete trip using Permission Service
    const modifyCheck = await this.permissionClient.checkTripModify(userId, id);

    if (!modifyCheck.can_modify) {
      throw new ForbiddenException('Only trip creator can delete trip');
    }

    await this.prisma.trip.delete({
      where: { id },
    });

    return { message: 'Trip deleted successfully' };
  }
}
