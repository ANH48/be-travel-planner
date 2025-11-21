import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsEnum,
  IsDateString,
  IsArray,
  ValidateNested,
  IsOptional,
  IsBoolean,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IsValidSplits } from '../../common/decorators/is-valid-splits.decorator';

export enum ExpenseCategory {
  FOOD = 'FOOD',
  TRANSPORT = 'TRANSPORT',
  ACCOMMODATION = 'ACCOMMODATION',
  ENTERTAINMENT = 'ENTERTAINMENT',
  OTHER = 'OTHER',
}

export enum SplitType {
  EQUAL = 'EQUAL',
  EXACT = 'EXACT',
  PERCENTAGE = 'PERCENTAGE',
}

export class ExpenseSplitDto {
  @IsString()
  @IsNotEmpty()
  memberId: string;

  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsNumber()
  @IsOptional()
  percentage?: number;
}

export class CreateExpenseDto {
  @IsString()
  @IsNotEmpty()
  paidById: string; // Match API requirements

  @IsEnum(ExpenseCategory)
  @IsNotEmpty()
  category: ExpenseCategory;

  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsDateString()
  @IsNotEmpty()
  date: string; // Match API requirements

  @IsString()
  @IsOptional()
  receiptImage?: string;

  @IsEnum(SplitType)
  @IsOptional()
  splitType?: SplitType;

  // Option to split evenly among all members (deprecated, use splitType: EQUAL)
  @IsBoolean()
  @IsOptional()
  splitEvenly?: boolean;

  // If splitType is EXACT or PERCENTAGE, splits must be provided and validated
  @ValidateIf(o => o.splitType === SplitType.EXACT || o.splitType === SplitType.PERCENTAGE || (!o.splitEvenly && o.splits))
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExpenseSplitDto)
  @IsValidSplits({ message: 'Total split amounts must equal the expense amount' })
  splits?: ExpenseSplitDto[];
}

export class UpdateExpenseDto {
  @IsString()
  @IsOptional()
  paidById?: string; // Match API requirements

  @IsEnum(ExpenseCategory)
  @IsOptional()
  category?: ExpenseCategory;

  @IsNumber()
  @IsOptional()
  amount?: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  @IsOptional()
  date?: string; // Match API requirements

  @IsString()
  @IsOptional()
  receiptImage?: string;

  @IsEnum(SplitType)
  @IsOptional()
  splitType?: SplitType;

  @IsBoolean()
  @IsOptional()
  splitEvenly?: boolean;

  @ValidateIf(o => o.splitType === SplitType.EXACT || o.splitType === SplitType.PERCENTAGE || (!o.splitEvenly && o.splits))
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExpenseSplitDto)
  @IsValidSplits({ message: 'Total split amounts must equal the expense amount' })
  splits?: ExpenseSplitDto[];
}
