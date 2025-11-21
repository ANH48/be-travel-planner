/**
 * Utility functions for expense split calculations
 */

export interface SplitMember {
  id: string;
  name: string;
}

export interface Split {
  memberId: string;
  amount: number;
  percentage?: number;
}

/**
 * Calculate even splits for all members
 * Handles rounding to ensure total matches exactly
 */
export function calculateEvenSplits(
  members: SplitMember[],
  totalAmount: number,
): Split[] {
  if (members.length === 0) {
    throw new Error('Cannot split expense with no members');
  }

  if (totalAmount <= 0) {
    throw new Error('Total amount must be greater than 0');
  }

  const splitAmount = Number((totalAmount / members.length).toFixed(2));
  let remaining = Number((totalAmount - splitAmount * members.length).toFixed(2));

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

/**
 * Calculate splits by percentage
 */
export function calculatePercentageSplits(
  splits: Array<{ memberId: string; percentage: number }>,
  totalAmount: number,
): Split[] {
  // Validate total percentage equals 100
  const totalPercentage = splits.reduce((sum, s) => sum + s.percentage, 0);
  
  if (Math.abs(totalPercentage - 100) > 0.01) {
    throw new Error('Total percentage must equal 100%');
  }

  let allocatedAmount = 0;
  const calculatedSplits: Split[] = [];

  splits.forEach((split, index) => {
    let amount: number;
    
    // For the last split, use remaining amount to avoid rounding errors
    if (index === splits.length - 1) {
      amount = Number((totalAmount - allocatedAmount).toFixed(2));
    } else {
      amount = Number(((totalAmount * split.percentage) / 100).toFixed(2));
      allocatedAmount += amount;
    }

    calculatedSplits.push({
      memberId: split.memberId,
      amount,
      percentage: split.percentage,
    });
  });

  return calculatedSplits;
}

/**
 * Validate that splits sum equals total amount
 */
export function validateSplitsSum(splits: Split[], totalAmount: number): boolean {
  const totalSplitAmount = splits.reduce((sum, split) => sum + split.amount, 0);
  const difference = Math.abs(totalSplitAmount - totalAmount);
  return difference < 0.01; // Allow for floating point precision
}
