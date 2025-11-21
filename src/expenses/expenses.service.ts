import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto, UpdateExpenseDto, SplitType } from './dto/expense.dto';
import { ExpenseResponseDto } from './dto/expense-response.dto';
import { calculateEvenSplits } from '../common/utils/split-calculator';
import {
  canAccessTrip,
  canModifyExpense,
  getUserMemberId,
} from '../common/helpers/trip-access.helper';
import { SettlementsService } from '../settlements/settlements.service';

@Injectable()
export class ExpensesService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => SettlementsService))
    private settlementsService: SettlementsService,
  ) {}

  async create(
    tripId: string,
    userId: string,
    userEmail: string,
    dto: CreateExpenseDto,
  ) {
    // Check if user has access to trip
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
        'You must be a member of the trip to add expenses',
      );
    }

    // Validate that payer belongs to the trip
    const payer = await this.prisma.tripMember.findFirst({
      where: { id: dto.paidById, tripId },
    });

    if (!payer) {
      throw new BadRequestException('Payer must be a member of this trip');
    }

    // Determine split type and create splits
    const splitType = dto.splitType || (dto.splitEvenly ? SplitType.EQUAL : SplitType.EXACT);
    const splits = await this.createExpenseSplits(
      tripId,
      dto.amount,
      splitType,
      dto.splits,
    );

    const expense = await this.prisma.expense.create({
      data: {
        tripId,
        payerId: dto.paidById,
        createdById,
        category: dto.category,
        amount: dto.amount,
        description: dto.description,
        expenseDate: new Date(dto.date),
        receiptImage: dto.receiptImage,
        splitType,
        splits: {
          create: splits.map((split) => ({
            memberId: split.memberId,
            amount: split.amount,
            percentage: split.percentage,
          })),
        },
      },
      include: {
        payer: true,
        createdBy: true,
        splits: {
          include: {
            member: true,
          },
        },
      },
    });

    // Trigger settlements recalculation
    await this.settlementsService.recalculateSettlements(tripId);

    return ExpenseResponseDto.fromPrisma(expense);
  }

  /**
   * Create expense splits based on split type
   */
  private async createExpenseSplits(
    tripId: string,
    amount: number,
    splitType: SplitType,
    providedSplits?: Array<{ memberId: string; amount: number; percentage?: number }>,
  ) {
    const members = await this.prisma.tripMember.findMany({
      where: { tripId },
    });

    if (members.length === 0) {
      throw new BadRequestException('Trip has no members to split expense');
    }

    switch (splitType) {
      case SplitType.EQUAL: {
        // Chia đều cho tất cả members
        const amountPerPerson = amount / members.length;
        return members.map((member) => ({
          memberId: member.id,
          amount: Number(amountPerPerson.toFixed(2)),
          percentage: Number((100 / members.length).toFixed(2)),
        }));
      }

      case SplitType.EXACT: {
        // Lấy từ input và validate
        if (!providedSplits || providedSplits.length === 0) {
          throw new BadRequestException(
            'Splits must be provided for EXACT split type',
          );
        }

        const totalSplitAmount = providedSplits.reduce(
          (sum, split) => sum + split.amount,
          0,
        );

        // Allow small rounding difference (0.01)
        if (Math.abs(totalSplitAmount - amount) > 0.01) {
          throw new BadRequestException(
            `Total split amounts (${totalSplitAmount}) must equal expense amount (${amount})`,
          );
        }

        // Validate all members belong to trip
        const memberIds = providedSplits.map((s) => s.memberId);
        const validMembers = await this.prisma.tripMember.findMany({
          where: {
            id: { in: memberIds },
            tripId,
          },
        });

        if (validMembers.length !== memberIds.length) {
          throw new BadRequestException(
            'All split members must belong to this trip',
          );
        }

        return providedSplits.map((split) => ({
          memberId: split.memberId,
          amount: Number(split.amount.toFixed(2)),
          percentage: Number(((split.amount / amount) * 100).toFixed(2)),
        }));
      }

      case SplitType.PERCENTAGE: {
        // Tính từ percentage
        if (!providedSplits || providedSplits.length === 0) {
          throw new BadRequestException(
            'Splits with percentages must be provided for PERCENTAGE split type',
          );
        }

        const totalPercentage = providedSplits.reduce(
          (sum, split) => sum + (split.percentage || 0),
          0,
        );

        // Allow small rounding difference
        if (Math.abs(totalPercentage - 100) > 0.1) {
          throw new BadRequestException(
            `Total percentages (${totalPercentage}) must equal 100`,
          );
        }

        // Validate all members belong to trip
        const memberIds = providedSplits.map((s) => s.memberId);
        const validMembers = await this.prisma.tripMember.findMany({
          where: {
            id: { in: memberIds },
            tripId,
          },
        });

        if (validMembers.length !== memberIds.length) {
          throw new BadRequestException(
            'All split members must belong to this trip',
          );
        }

        return providedSplits.map((split) => ({
          memberId: split.memberId,
          amount: Number(((amount * (split.percentage || 0)) / 100).toFixed(2)),
          percentage: Number((split.percentage || 0).toFixed(2)),
        }));
      }

      default:
        throw new BadRequestException(`Invalid split type: ${splitType}`);
    }
  }

  private calculateEvenSplits(
    members: Array<{ id: string; name: string }>,
    totalAmount: number,
  ) {
    const splitAmount = Number((totalAmount / members.length).toFixed(2));
    let remaining = totalAmount - splitAmount * members.length;

    return members.map((member, index) => {
      // Add remaining cents to the first member to ensure total matches
      const amount = index === 0 ? splitAmount + remaining : splitAmount;
      return {
        memberId: member.id,
        amount: Number(amount.toFixed(2)),
        percentage: Number(((amount / totalAmount) * 100).toFixed(2)),
      };
    });
  }

  async findAll(tripId: string) {
    const expenses = await this.prisma.expense.findMany({
      where: { tripId },
      include: {
        payer: true,
        createdBy: true,
        splits: {
          include: {
            member: true,
          },
        },
      },
      orderBy: { expenseDate: 'desc' },
    });

    return expenses.map((expense) => ExpenseResponseDto.fromPrisma(expense));
  }

  async findOne(id: string) {
    const expense = await this.prisma.expense.findUnique({
      where: { id },
      include: {
        payer: true,
        createdBy: true,
        splits: {
          include: {
            member: true,
          },
        },
      },
    });

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    return expense;
  }

  async findOneFormatted(id: string) {
    const expense = await this.findOne(id);
    return ExpenseResponseDto.fromPrisma(expense);
  }

  async update(
    id: string,
    userId: string,
    userEmail: string,
    dto: UpdateExpenseDto,
  ) {
    const expense = await this.findOne(id);

    // Get trip with members for authorization
    const trip = await this.prisma.trip.findUnique({
      where: { id: expense.tripId },
      include: { members: true },
    });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    // Check if user can modify this expense (creator or expense owner)
    const canModify = canModifyExpense(userId, userEmail, trip, expense.createdById);
    if (!canModify) {
      throw new ForbiddenException(
        'You can only modify expenses you created',
      );
    }

    const newAmount = dto.amount || Number(expense.amount);
    const newSplitType = (dto.splitType || (dto.splitEvenly ? SplitType.EQUAL : expense.splitType)) as SplitType;

    // Create new splits if split type or amount changed
    let newSplits;
    if (dto.splitType || dto.splits || dto.amount || dto.splitEvenly) {
      newSplits = await this.createExpenseSplits(
        expense.tripId,
        newAmount,
        newSplitType,
        dto.splits,
      );

      // Delete existing splits
      await this.prisma.expenseSplit.deleteMany({
        where: { expenseId: id },
      });
    }

    const updatedExpense = await this.prisma.expense.update({
      where: { id },
      data: {
        payerId: dto.paidById,
        category: dto.category,
        amount: dto.amount,
        description: dto.description,
        expenseDate: dto.date ? new Date(dto.date) : undefined,
        receiptImage: dto.receiptImage,
        splitType: dto.splitType,
        splits: newSplits
          ? {
              create: newSplits.map((split) => ({
                memberId: split.memberId,
                amount: split.amount,
                percentage: split.percentage,
              })),
            }
          : undefined,
      },
      include: {
        payer: true,
        splits: {
          include: {
            member: true,
          },
        },
      },
    });

    // Trigger settlements recalculation
    await this.settlementsService.recalculateSettlements(expense.tripId);

    return ExpenseResponseDto.fromPrisma(updatedExpense);
  }

  async remove(id: string, userId: string, userEmail: string) {
    const expense = await this.findOne(id);
    const tripId = expense.tripId;

    // Get trip with members for authorization
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: { members: true },
    });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    // Check if user can delete this expense (creator or expense owner)
    const canModify = canModifyExpense(userId, userEmail, trip, expense.createdById);
    if (!canModify) {
      throw new ForbiddenException(
        'You can only delete expenses you created',
      );
    }

    await this.prisma.expense.delete({
      where: { id },
    });

    // Trigger settlements recalculation
    await this.settlementsService.recalculateSettlements(tripId);

    return { message: 'Expense deleted successfully' };
  }
}
