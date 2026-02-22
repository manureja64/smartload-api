import { LoadOptimizerService } from './load-optimizer.service';
import { OptimizeRequestDto } from './dto';
import { plainToInstance } from 'class-transformer';

function buildRequest(overrides: Record<string, unknown> = {}): OptimizeRequestDto {
  return plainToInstance(OptimizeRequestDto, {
    truck: { id: 'truck-123', max_weight_lbs: 44000, max_volume_cuft: 3000 },
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
      {
        id: 'ord-002',
        payout_cents: 180000,
        weight_lbs: 12000,
        volume_cuft: 900,
        origin: 'Los Angeles, CA',
        destination: 'Dallas, TX',
        pickup_date: '2025-12-04',
        delivery_date: '2025-12-10',
        is_hazmat: false,
      },
      {
        id: 'ord-003',
        payout_cents: 320000,
        weight_lbs: 30000,
        volume_cuft: 1800,
        origin: 'Los Angeles, CA',
        destination: 'Dallas, TX',
        pickup_date: '2025-12-06',
        delivery_date: '2025-12-08',
        is_hazmat: true,
      },
    ],
    ...overrides,
  });
}

describe('LoadOptimizerService', () => {
  let service: LoadOptimizerService;

  beforeEach(() => {
    service = new LoadOptimizerService();
  });

  it('should return the PDF expected result with hazmat isolation', () => {
    const request = buildRequest();
    const result = service.optimize(request);

    expect(result.truck_id).toBe('truck-123');
    expect(result.selected_order_ids).toEqual(['ord-001', 'ord-002']);
    expect(result.total_payout_cents).toBe(430000);
    expect(result.total_weight_lbs).toBe(30000);
    expect(result.total_volume_cuft).toBe(2100);
    expect(result.utilization_weight_percent).toBe(68.18);
    expect(result.utilization_volume_percent).toBe(70);
  });

  it('should return empty result for no orders', () => {
    const request = buildRequest({ orders: [] });
    const result = service.optimize(request);

    expect(result.selected_order_ids).toEqual([]);
    expect(result.total_payout_cents).toBe(0);
    expect(result.total_weight_lbs).toBe(0);
    expect(result.total_volume_cuft).toBe(0);
    expect(result.utilization_weight_percent).toBe(0);
    expect(result.utilization_volume_percent).toBe(0);
  });

  it('should isolate hazmat from non-hazmat orders', () => {
    const request = buildRequest({
      orders: [
        {
          id: 'ord-1',
          payout_cents: 100000,
          weight_lbs: 5000,
          volume_cuft: 300,
          origin: 'A',
          destination: 'B',
          pickup_date: '2025-12-01',
          delivery_date: '2025-12-10',
          is_hazmat: false,
        },
        {
          id: 'ord-2',
          payout_cents: 200000,
          weight_lbs: 5000,
          volume_cuft: 300,
          origin: 'A',
          destination: 'B',
          pickup_date: '2025-12-01',
          delivery_date: '2025-12-10',
          is_hazmat: true,
        },
      ],
    });

    const result = service.optimize(request);

    expect(result.selected_order_ids).toEqual(['ord-2']);
    expect(result.total_payout_cents).toBe(200000);
  });

  it('should pick the best lane group when orders have different routes', () => {
    const request = buildRequest({
      orders: [
        {
          id: 'ord-1',
          payout_cents: 100000,
          weight_lbs: 5000,
          volume_cuft: 300,
          origin: 'A',
          destination: 'B',
          pickup_date: '2025-12-01',
          delivery_date: '2025-12-10',
          is_hazmat: false,
        },
        {
          id: 'ord-2',
          payout_cents: 150000,
          weight_lbs: 5000,
          volume_cuft: 300,
          origin: 'C',
          destination: 'D',
          pickup_date: '2025-12-01',
          delivery_date: '2025-12-10',
          is_hazmat: false,
        },
        {
          id: 'ord-3',
          payout_cents: 120000,
          weight_lbs: 5000,
          volume_cuft: 300,
          origin: 'A',
          destination: 'B',
          pickup_date: '2025-12-01',
          delivery_date: '2025-12-10',
          is_hazmat: false,
        },
      ],
    });

    const result = service.optimize(request);

    // A->B group: ord-1 + ord-3 = 220k. C->D group: ord-2 = 150k.
    expect(result.selected_order_ids).toEqual(['ord-1', 'ord-3']);
    expect(result.total_payout_cents).toBe(220000);
  });

  it('should compute utilization percentages correctly', () => {
    const request = buildRequest({
      truck: { id: 'truck-1', max_weight_lbs: 50000, max_volume_cuft: 2000 },
      orders: [
        {
          id: 'ord-1',
          payout_cents: 100000,
          weight_lbs: 15000,
          volume_cuft: 750,
          origin: 'A',
          destination: 'B',
          pickup_date: '2025-12-01',
          delivery_date: '2025-12-10',
          is_hazmat: false,
        },
      ],
    });

    const result = service.optimize(request);

    expect(result.utilization_weight_percent).toBe(30);
    expect(result.utilization_volume_percent).toBe(37.5);
  });

  it('should return empty when no single order fits', () => {
    const request = buildRequest({
      truck: { id: 'truck-1', max_weight_lbs: 1000, max_volume_cuft: 100 },
      orders: [
        {
          id: 'ord-1',
          payout_cents: 500000,
          weight_lbs: 5000,
          volume_cuft: 300,
          origin: 'A',
          destination: 'B',
          pickup_date: '2025-12-01',
          delivery_date: '2025-12-10',
          is_hazmat: false,
        },
      ],
    });

    const result = service.optimize(request);

    expect(result.selected_order_ids).toEqual([]);
    expect(result.total_payout_cents).toBe(0);
  });
});
