import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { OptimizeRequestDto } from './optimize-request.dto';

function buildRequest(overrides: Record<string, unknown> = {}): OptimizeRequestDto {
  return plainToInstance(OptimizeRequestDto, {
    truck: {
      id: 'truck-123',
      max_weight_lbs: 44000,
      max_volume_cuft: 3000,
    },
    orders: [
      {
        id: 'ord-001',
        payout_cents: 250000,
        weight_lbs: 18000,
        volume_cuft: 1200,
        origin: 'Los Angeles, CA',
        destination: 'Dallas, TX',
        pickup_date: '2025-12-05',
        delivery_date: '2025-12-09',
        is_hazmat: false,
      },
    ],
    ...overrides,
  });
}

describe('OptimizeRequestDto', () => {
  it('should pass with valid input', async () => {
    const dto = buildRequest();
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail when truck is missing fields', async () => {
    const dto = buildRequest({ truck: { id: 'truck-1' } });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail when truck weight is negative', async () => {
    const dto = buildRequest({
      truck: { id: 'truck-1', max_weight_lbs: -100, max_volume_cuft: 3000 },
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail when truck volume is not an integer', async () => {
    const dto = buildRequest({
      truck: { id: 'truck-1', max_weight_lbs: 44000, max_volume_cuft: 30.5 },
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail when orders exceed max size of 22', async () => {
    const orders = Array.from({ length: 23 }, (_, i) => ({
      id: `ord-${i}`,
      payout_cents: 1000,
      weight_lbs: 100,
      volume_cuft: 10,
      origin: 'A',
      destination: 'B',
      pickup_date: '2025-12-05',
      delivery_date: '2025-12-09',
      is_hazmat: false,
    }));
    const dto = buildRequest({ orders });
    const errors = await validate(dto);
    const ordersError = errors.find((e) => e.property === 'orders');
    expect(ordersError).toBeDefined();
  });

  it('should fail when order has invalid fields', async () => {
    const dto = buildRequest({
      orders: [{ id: '', payout_cents: -1 }],
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should pass with empty orders array', async () => {
    const dto = buildRequest({ orders: [] });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});
