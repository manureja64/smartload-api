import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';

describe('App (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /healthz', () => {
    it('should return 200 with status ok', () => {
      return request(app.getHttpServer())
        .get('/healthz')
        .expect(200)
        .expect((res: request.Response) => {
          expect(res.body.status).toBe('ok');
          expect(res.body.timestamp).toBeDefined();
        });
    });
  });

  describe('POST /api/v1/load-optimizer/optimize', () => {
    const validRequest = {
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
    };

    it('should return 200 with the PDF expected result', () => {
      return request(app.getHttpServer())
        .post('/api/v1/load-optimizer/optimize')
        .send(validRequest)
        .expect(200)
        .expect((res: request.Response) => {
          expect(res.body.truck_id).toBe('truck-123');
          expect(res.body.selected_order_ids).toEqual(['ord-001', 'ord-002']);
          expect(res.body.total_payout_cents).toBe(430000);
          expect(res.body.total_weight_lbs).toBe(30000);
          expect(res.body.total_volume_cuft).toBe(2100);
          expect(res.body.utilization_weight_percent).toBe(68.18);
          expect(res.body.utilization_volume_percent).toBe(70);
        });
    });

    it('should return 200 with empty selection for no orders', () => {
      return request(app.getHttpServer())
        .post('/api/v1/load-optimizer/optimize')
        .send({ truck: validRequest.truck, orders: [] })
        .expect(200)
        .expect((res: request.Response) => {
          expect(res.body.selected_order_ids).toEqual([]);
          expect(res.body.total_payout_cents).toBe(0);
        });
    });

    it('should return 400 when truck is missing', () => {
      return request(app.getHttpServer())
        .post('/api/v1/load-optimizer/optimize')
        .send({ orders: [] })
        .expect(400);
    });

    it('should return 400 when order has invalid fields', () => {
      return request(app.getHttpServer())
        .post('/api/v1/load-optimizer/optimize')
        .send({
          truck: validRequest.truck,
          orders: [{ id: '', payout_cents: -1 }],
        })
        .expect(400);
    });

    it('should return 400 when delivery_date is before pickup_date', () => {
      return request(app.getHttpServer())
        .post('/api/v1/load-optimizer/optimize')
        .send({
          truck: validRequest.truck,
          orders: [
            {
              ...validRequest.orders[0],
              pickup_date: '2025-12-10',
              delivery_date: '2025-12-05',
            },
          ],
        })
        .expect(400);
    });

    it('should return 400 when orders exceed max size of 22', () => {
      const orders = Array.from({ length: 23 }, (_, i) => ({
        ...validRequest.orders[0],
        id: `ord-${i}`,
      }));
      return request(app.getHttpServer())
        .post('/api/v1/load-optimizer/optimize')
        .send({ truck: validRequest.truck, orders })
        .expect(400);
    });

    it('should return 400 for unknown properties', () => {
      return request(app.getHttpServer())
        .post('/api/v1/load-optimizer/optimize')
        .send({ ...validRequest, unknown_field: 'test' })
        .expect(400);
    });

    it('should respond within 800ms for n=20 orders', async () => {
      const orders = Array.from({ length: 20 }, (_, i) => ({
        id: `ord-${i}`,
        payout_cents: 10000 + i * 1000,
        weight_lbs: 1000 + i * 100,
        volume_cuft: 50 + i * 10,
        origin: 'Los Angeles, CA',
        destination: 'Dallas, TX',
        pickup_date: '2025-12-01',
        delivery_date: '2025-12-30',
        is_hazmat: false,
      }));

      const start = performance.now();
      const res = await request(app.getHttpServer())
        .post('/api/v1/load-optimizer/optimize')
        .send({ truck: validRequest.truck, orders });
      const elapsed = performance.now() - start;

      expect(res.status).toBe(200);
      expect(res.body.total_weight_lbs).toBeLessThanOrEqual(44000);
      expect(res.body.total_volume_cuft).toBeLessThanOrEqual(3000);
      expect(elapsed).toBeLessThan(800);
    });
  });
});
