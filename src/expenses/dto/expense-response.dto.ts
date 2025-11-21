export class ExpenseResponseDto {
  id: string;
  tripId: string;
  category: string;
  amount: string; // Decimal as string
  description: string;
  date: string; // ISO date string from expenseDate
  receiptImage?: string;
  splitType: string;
  paidBy: {
    id: string;
    name: string;
    email?: string;
  };
  createdBy?: {
    id: string;
    name: string;
  };
  splits: Array<{
    id: string;
    memberId: string;
    amount: string;
    percentage?: string;
    member: {
      id: string;
      name: string;
      email?: string;
    };
  }>;
  createdAt: string;
  updatedAt: string;

  static fromPrisma(expense: any): ExpenseResponseDto {
    return {
      id: expense.id,
      tripId: expense.tripId,
      category: expense.category,
      amount: expense.amount.toString(),
      description: expense.description,
      date: expense.expenseDate.toISOString(), // Transform expenseDate to date
      receiptImage: expense.receiptImage,
      splitType: expense.splitType,
      paidBy: {
        // Transform payer to paidBy
        id: expense.payer.id,
        name: expense.payer.name,
        email: expense.payer.email,
      },
      createdBy: expense.createdBy
        ? {
            id: expense.createdBy.id,
            name: expense.createdBy.name,
          }
        : undefined,
      splits: expense.splits.map((split: any) => ({
        id: split.id,
        memberId: split.memberId,
        amount: split.amount.toString(),
        percentage: split.percentage?.toString(),
        member: {
          id: split.member.id,
          name: split.member.name,
          email: split.member.email,
        },
      })),
      createdAt: expense.createdAt.toISOString(),
      updatedAt: expense.updatedAt.toISOString(),
    };
  }
}
