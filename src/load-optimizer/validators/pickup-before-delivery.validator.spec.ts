import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { OrderDto } from '../dto/order.dto';

function buildOrder(overrides: Partial<Record<keyof OrderDto, unknown>> = {}): OrderDto {
  return plainToInstance(OrderDto, {
    id: 'ord-001',
    payout_cents: 250000,
    weight_lbs: 18000,
    volume_cuft: 1200,
    origin: 'Los Angeles, CA',
    destination: 'Dallas, TX',
    pickup_date: '2025-12-05',
    delivery_date: '2025-12-09',
    is_hazmat: false,
    ...overrides,
  });
}

describe('IsPickupBeforeDelivery', () => {
  it('should pass when delivery_date is after pickup_date', async () => {
    const order = buildOrder();
    const errors = await validate(order);
    expect(errors).toHaveLength(0);
  });

  it('should pass when delivery_date equals pickup_date', async () => {
    const order = buildOrder({ pickup_date: '2025-12-05', delivery_date: '2025-12-05' });
    const errors = await validate(order);
    expect(errors).toHaveLength(0);
  });

  it('should fail when delivery_date is before pickup_date', async () => {
    const order = buildOrder({ pickup_date: '2025-12-10', delivery_date: '2025-12-05' });
    const errors = await validate(order);
    const deliveryError = errors.find((e) => e.property === 'delivery_date');
    expect(deliveryError).toBeDefined();
    expect(deliveryError!.constraints).toHaveProperty('isPickupBeforeDelivery');
  });

  it('should skip validation when pickup_date is not a string', async () => {
    const order = buildOrder({ pickup_date: 12345 });
    const errors = await validate(order);
    const deliveryError = errors.find((e) => e.property === 'delivery_date');
    expect(
      deliveryError === undefined ||
        !deliveryError.constraints?.['isPickupBeforeDelivery'],
    ).toBe(true);
  });

  it('should skip validation when delivery_date is not a string', async () => {
    const order = buildOrder({ delivery_date: 12345 });
    const errors = await validate(order);
    const deliveryError = errors.find((e) => e.property === 'delivery_date');
    const hasPickupBeforeDeliveryError =
      deliveryError?.constraints?.['isPickupBeforeDelivery'];
    expect(hasPickupBeforeDeliveryError).toBeUndefined();
  });
});
