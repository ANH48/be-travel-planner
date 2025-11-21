import { Decimal } from '@prisma/client/runtime/library';

export class SettlementResponseDto {
  id: string;
  tripId: string;
  memberId: string;
  memberName: string;
  amount: number;
  createdAt: Date;
  updatedAt: Date;
}

export class SettlementListResponseDto {
  settlements: SettlementResponseDto[];
  total: number;
}

export class ExpenseBreakdownDto {
  expenseId: string;
  description: string;
  amount: number;
  splitType: string;
  expenseDate: Date;
}

export class SettlementDetailResponseDto {
  id: string;
  tripId: string;
  memberId: string;
  memberName: string;
  totalAmount: number;
  breakdown: ExpenseBreakdownDto[];
  createdAt: Date;
  updatedAt: Date;
}
