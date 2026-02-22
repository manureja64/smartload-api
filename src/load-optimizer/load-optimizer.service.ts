import { Injectable } from '@nestjs/common';
import { OptimizeRequestDto, OptimizeResponseDto } from './dto';
import {
  findOptimalLoad,
  groupOrdersByCompatibility,
  OptimizerResult,
} from './optimizer/bitmask-dp.optimizer';

@Injectable()
export class LoadOptimizerService {
  optimize(request: OptimizeRequestDto): OptimizeResponseDto {
    const { truck, orders } = request;

    if (orders.length === 0) {
      return this.buildResponse(truck.id, [], truck.max_weight_lbs, truck.max_volume_cuft);
    }

    const groups = groupOrdersByCompatibility(orders);

    let bestResult: OptimizerResult = {
      selectedIndices: [],
      totalPayoutCents: 0,
      totalWeightLbs: 0,
      totalVolumeCuft: 0,
    };
    let bestGroupOrders: typeof orders = [];

    for (const [, groupOrders] of groups) {
      const result = findOptimalLoad({
        maxWeightLbs: truck.max_weight_lbs,
        maxVolumeCuft: truck.max_volume_cuft,
        orders: groupOrders,
      });

      if (result.totalPayoutCents > bestResult.totalPayoutCents) {
        bestResult = result;
        bestGroupOrders = groupOrders;
      }
    }

    const selectedOrders = bestResult.selectedIndices.map((i) => bestGroupOrders[i]);
    return this.buildResponse(
      truck.id,
      selectedOrders,
      truck.max_weight_lbs,
      truck.max_volume_cuft,
    );
  }

  private buildResponse(
    truckId: string,
    selectedOrders: { id: string; payout_cents: number; weight_lbs: number; volume_cuft: number }[],
    maxWeight: number,
    maxVolume: number,
  ): OptimizeResponseDto {
    const totalPayout = selectedOrders.reduce((sum, o) => sum + o.payout_cents, 0);
    const totalWeight = selectedOrders.reduce((sum, o) => sum + o.weight_lbs, 0);
    const totalVolume = selectedOrders.reduce((sum, o) => sum + o.volume_cuft, 0);

    return {
      truck_id: truckId,
      selected_order_ids: selectedOrders.map((o) => o.id),
      total_payout_cents: totalPayout,
      total_weight_lbs: totalWeight,
      total_volume_cuft: totalVolume,
      utilization_weight_percent: Math.round((totalWeight / maxWeight) * 10000) / 100,
      utilization_volume_percent: Math.round((totalVolume / maxVolume) * 10000) / 100,
    };
  }
}
