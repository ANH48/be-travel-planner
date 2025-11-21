import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  SettlementResponseDto,
  SettlementListResponseDto,
  SettlementDetailResponseDto,
  ExpenseBreakdownDto,
} from './dto/settlement-response.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class SettlementsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get all settlements for a trip
   */
  async getSettlements(tripId: string): Promise<SettlementListResponseDto> {
    // Verify trip exists
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
    });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    const settlements = await this.prisma.settlement.findMany({
      where: { tripId },
      include: {
        member: true,
      },
      orderBy: {
        amount: 'desc',
      },
    });

    const total = settlements.reduce(
      (sum, settlement) => sum + Number(settlement.amount),
      0,
    );

    return {
      settlements: settlements.map((settlement) => ({
        id: settlement.id,
        tripId: settlement.tripId,
        memberId: settlement.memberId,
        memberName: settlement.member.name,
        amount: Number(settlement.amount),
        createdAt: settlement.createdAt,
        updatedAt: settlement.updatedAt,
      })),
      total,
    };
  }

  /**
   * Get settlement detail for a specific member
   */
  async getSettlementDetail(
    tripId: string,
    memberId: string,
  ): Promise<SettlementDetailResponseDto> {
    const settlement = await this.prisma.settlement.findUnique({
      where: {
        tripId_memberId: {
          tripId,
          memberId,
        },
      },
      include: {
        member: true,
      },
    });

    if (!settlement) {
      throw new NotFoundException('Settlement not found for this member');
    }

    // Get all expense splits for this member
    const expenseSplits = await this.prisma.expenseSplit.findMany({
      where: {
        memberId,
        expense: {
          tripId,
        },
      },
      include: {
        expense: true,
      },
      orderBy: {
        expense: {
          expenseDate: 'desc',
        },
      },
    });

    const breakdown: ExpenseBreakdownDto[] = expenseSplits.map((split) => ({
      expenseId: split.expense.id,
      description: split.expense.description,
      amount: Number(split.amount),
      splitType: split.expense.splitType,
      expenseDate: split.expense.expenseDate,
    }));

    return {
      id: settlement.id,
      tripId: settlement.tripId,
      memberId: settlement.memberId,
      memberName: settlement.member.name,
      totalAmount: Number(settlement.amount),
      breakdown,
      createdAt: settlement.createdAt,
      updatedAt: settlement.updatedAt,
    };
  }

  /**
   * Recalculate settlements for a trip
   * This should be called whenever expenses are created/updated/deleted
   */
  async recalculateSettlements(tripId: string): Promise<void> {
    // 1. Get all active members
    const members = await this.prisma.tripMember.findMany({
      where: { tripId },
    });

    // 2. Get all expense splits for this trip
    const expenseSplits = await this.prisma.expenseSplit.findMany({
      where: {
        expense: {
          tripId,
        },
      },
    });

    // 3. Calculate total amount per member
    const settlementMap = new Map<string, number>();

    // Initialize all members with 0
    members.forEach((member) => {
      settlementMap.set(member.id, 0);
    });

    // Sum up all splits per member
    expenseSplits.forEach((split) => {
      const currentAmount = settlementMap.get(split.memberId) || 0;
      settlementMap.set(split.memberId, currentAmount + Number(split.amount));
    });

    // 4. Upsert settlements
    const upsertPromises = Array.from(settlementMap.entries()).map(
      ([memberId, amount]) =>
        this.prisma.settlement.upsert({
          where: {
            tripId_memberId: {
              tripId,
              memberId,
            },
          },
          create: {
            tripId,
            memberId,
            amount: new Decimal(amount),
          },
          update: {
            amount: new Decimal(amount),
          },
        }),
    );

    await Promise.all(upsertPromises);
  }
}
