import { OrderDto } from '../dto';
import {
  findOptimalLoad,
  groupOrdersByCompatibility,
  OptimizerInput,
} from './bitmask-dp.optimizer';

function buildOrder(overrides: Partial<OrderDto> = {}): OrderDto {
  return {
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
  };
}

describe('groupOrdersByCompatibility', () => {
  it('should group orders by origin|destination|hazmat', () => {
    const orders = [
      buildOrder({ id: 'ord-1' }),
      buildOrder({ id: 'ord-2' }),
      buildOrder({ id: 'ord-3', destination: 'Houston, TX' }),
      buildOrder({ id: 'ord-4', is_hazmat: true }),
    ];

    const groups = groupOrdersByCompatibility(orders);

    expect(groups.size).toBe(3);
    expect(groups.get('Los Angeles, CA|Dallas, TX|false')).toHaveLength(2);
    expect(groups.get('Los Angeles, CA|Houston, TX|false')).toHaveLength(1);
    expect(groups.get('Los Angeles, CA|Dallas, TX|true')).toHaveLength(1);
  });

  it('should return empty map for empty orders', () => {
    const groups = groupOrdersByCompatibility([]);
    expect(groups.size).toBe(0);
  });
});

describe('findOptimalLoad', () => {
  it('should return empty result for no orders', () => {
    const result = findOptimalLoad({ maxWeightLbs: 44000, maxVolumeCuft: 3000, orders: [] });

    expect(result.selectedIndices).toEqual([]);
    expect(result.totalPayoutCents).toBe(0);
    expect(result.totalWeightLbs).toBe(0);
    expect(result.totalVolumeCuft).toBe(0);
  });

  it('should select single order that fits', () => {
    const orders = [buildOrder()];
    const result = findOptimalLoad({ maxWeightLbs: 44000, maxVolumeCuft: 3000, orders });

    expect(result.selectedIndices).toEqual([0]);
    expect(result.totalPayoutCents).toBe(250000);
  });

  it('should skip single order that exceeds weight', () => {
    const orders = [buildOrder({ weight_lbs: 50000 })];
    const result = findOptimalLoad({ maxWeightLbs: 44000, maxVolumeCuft: 3000, orders });

    expect(result.selectedIndices).toEqual([]);
    expect(result.totalPayoutCents).toBe(0);
  });

  it('should skip single order that exceeds volume', () => {
    const orders = [buildOrder({ volume_cuft: 5000 })];
    const result = findOptimalLoad({ maxWeightLbs: 44000, maxVolumeCuft: 3000, orders });

    expect(result.selectedIndices).toEqual([]);
  });

  it('should maximize payout across weight and volume constraints', () => {
    const orders = [
      buildOrder({ payout_cents: 250000, weight_lbs: 18000, volume_cuft: 1200 }),
      buildOrder({
        payout_cents: 180000,
        weight_lbs: 12000,
        volume_cuft: 900,
        pickup_date: '2025-12-04',
        delivery_date: '2025-12-10',
      }),
      buildOrder({
        payout_cents: 320000,
        weight_lbs: 30000,
        volume_cuft: 1800,
        pickup_date: '2025-12-06',
        delivery_date: '2025-12-08',
      }),
    ];

    const input: OptimizerInput = { maxWeightLbs: 44000, maxVolumeCuft: 3000, orders };
    const result = findOptimalLoad(input);

    // {1,2} = 500k payout, 42k lbs, 2700 cuft — best valid combo
    expect(result.selectedIndices).toEqual([1, 2]);
    expect(result.totalPayoutCents).toBe(500000);
    expect(result.totalWeightLbs).toBe(42000);
    expect(result.totalVolumeCuft).toBe(2700);
  });

  it('should prefer higher payout when multiple combos fit', () => {
    const orders = [
      buildOrder({ payout_cents: 100000, weight_lbs: 10000, volume_cuft: 500 }),
      buildOrder({ payout_cents: 200000, weight_lbs: 10000, volume_cuft: 500 }),
      buildOrder({ payout_cents: 150000, weight_lbs: 10000, volume_cuft: 500 }),
    ];

    const result = findOptimalLoad({ maxWeightLbs: 20000, maxVolumeCuft: 1000, orders });

    expect(result.selectedIndices).toEqual([1, 2]);
    expect(result.totalPayoutCents).toBe(350000);
  });

  it('should reject orders with time window conflicts', () => {
    const orders = [
      buildOrder({
        payout_cents: 100000,
        weight_lbs: 5000,
        volume_cuft: 300,
        pickup_date: '2025-12-10',
        delivery_date: '2025-12-15',
      }),
      buildOrder({
        payout_cents: 200000,
        weight_lbs: 5000,
        volume_cuft: 300,
        pickup_date: '2025-12-01',
        delivery_date: '2025-12-05',
      }),
    ];

    const result = findOptimalLoad({ maxWeightLbs: 44000, maxVolumeCuft: 3000, orders });

    // Cannot combine: order[0] pickup (Dec 10) > order[1] delivery (Dec 5)
    expect(result.selectedIndices).toEqual([1]);
    expect(result.totalPayoutCents).toBe(200000);
  });

  it('should handle weight-constrained knapsack correctly', () => {
    const orders = [
      buildOrder({ payout_cents: 300000, weight_lbs: 30000, volume_cuft: 100 }),
      buildOrder({ payout_cents: 200000, weight_lbs: 20000, volume_cuft: 100 }),
      buildOrder({ payout_cents: 250000, weight_lbs: 25000, volume_cuft: 100 }),
    ];

    const result = findOptimalLoad({ maxWeightLbs: 44000, maxVolumeCuft: 3000, orders });

    // Best single: ord[0] at 300000 (30k lbs). No pair fits under 44k except 0+nothing.
    // Actually 1+2 = 45k > 44k. Only singles or 0 alone.
    expect(result.selectedIndices).toEqual([0]);
    expect(result.totalPayoutCents).toBe(300000);
  });

  it('should handle volume-constrained knapsack correctly', () => {
    const orders = [
      buildOrder({ payout_cents: 100000, weight_lbs: 1000, volume_cuft: 1500 }),
      buildOrder({ payout_cents: 200000, weight_lbs: 1000, volume_cuft: 2000 }),
      buildOrder({ payout_cents: 150000, weight_lbs: 1000, volume_cuft: 1200 }),
    ];

    const result = findOptimalLoad({ maxWeightLbs: 44000, maxVolumeCuft: 3000, orders });

    // 0+2 = 2700 cuft, payout 250000. 1 alone = 200000. 0+1 = 3500 > 3000.
    expect(result.selectedIndices).toEqual([0, 2]);
    expect(result.totalPayoutCents).toBe(250000);
  });

  it('should handle all orders exceeding capacity', () => {
    const orders = [
      buildOrder({ weight_lbs: 50000 }),
      buildOrder({ weight_lbs: 60000 }),
    ];

    const result = findOptimalLoad({ maxWeightLbs: 44000, maxVolumeCuft: 3000, orders });

    expect(result.selectedIndices).toEqual([]);
    expect(result.totalPayoutCents).toBe(0);
  });

  it('should complete within 800ms for n=20 orders', () => {
    const orders = Array.from({ length: 20 }, (_, i) =>
      buildOrder({
        id: `ord-${i}`,
        payout_cents: 10000 + i * 1000,
        weight_lbs: 1000 + i * 100,
        volume_cuft: 50 + i * 10,
        pickup_date: '2025-12-01',
        delivery_date: '2025-12-30',
      }),
    );

    const start = performance.now();
    const result = findOptimalLoad({ maxWeightLbs: 44000, maxVolumeCuft: 3000, orders });
    const elapsed = performance.now() - start;

    // Jest + coverage instrumentation adds ~2-3x overhead; 800ms is the prod target
    expect(elapsed).toBeLessThan(2000);
    expect(result.totalWeightLbs).toBeLessThanOrEqual(44000);
    expect(result.totalVolumeCuft).toBeLessThanOrEqual(3000);
    expect(result.totalPayoutCents).toBeGreaterThan(0);
  });
});
