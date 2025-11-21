import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

export function IsValidSplits(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isValidSplits',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const splits = value;
          const amount = (args.object as any).amount;
          
          if (!splits || !Array.isArray(splits) || splits.length === 0) {
            return false;
          }
          
          // Calculate total split amount
          const totalSplitAmount = splits.reduce(
            (sum: number, split: any) => sum + Number(split.amount || 0),
            0,
          );
          
          // Check if total splits equal the expense amount (with small tolerance for floating point)
          const difference = Math.abs(totalSplitAmount - Number(amount));
          return difference < 0.01;
        },
        defaultMessage() {
          return 'Total split amounts must equal the expense amount';
        },
      },
    });
  };
}
