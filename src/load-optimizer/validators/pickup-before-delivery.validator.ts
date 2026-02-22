import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

export function IsPickupBeforeDelivery(validationOptions?: ValidationOptions) {
  return function (target: object, propertyName: string) {
    registerDecorator({
      name: 'isPickupBeforeDelivery',
      target: target.constructor,
      propertyName,
      options: {
        message: 'delivery_date must be on or after pickup_date',
        ...validationOptions,
      },
      validator: {
        validate(_value: unknown, args: ValidationArguments) {
          const obj = args.object as Record<string, unknown>;
          const pickup = obj['pickup_date'];
          const delivery = obj['delivery_date'];

          if (typeof pickup !== 'string' || typeof delivery !== 'string') {
            return true; // Let other validators handle type checks
          }

          return delivery >= pickup;
        },
      },
    });
  };
}
