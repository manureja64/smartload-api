import { Test, TestingModule } from '@nestjs/testing';
import { LoadOptimizerController } from './load-optimizer.controller';
import { LoadOptimizerService } from './load-optimizer.service';
import { OptimizeRequestDto, OptimizeResponseDto } from './dto';

describe('LoadOptimizerController', () => {
  let controller: LoadOptimizerController;
  let service: LoadOptimizerService;

  const mockResponse: OptimizeResponseDto = {
    truck_id: 'truck-123',
    selected_order_ids: ['ord-001'],
    total_payout_cents: 250000,
    total_weight_lbs: 18000,
    total_volume_cuft: 1200,
    utilization_weight_percent: 40.91,
    utilization_volume_percent: 40,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LoadOptimizerController],
      providers: [
        {
          provide: LoadOptimizerService,
          useValue: { optimize: jest.fn().mockReturnValue(mockResponse) },
        },
      ],
    }).compile();

    controller = module.get<LoadOptimizerController>(LoadOptimizerController);
    service = module.get<LoadOptimizerService>(LoadOptimizerService);
  });

  it('should call service.optimize and return the result', () => {
    const request = {} as OptimizeRequestDto;
    const result = controller.optimize(request);

    expect(service.optimize).toHaveBeenCalledWith(request);
    expect(result).toEqual(mockResponse);
  });
});
