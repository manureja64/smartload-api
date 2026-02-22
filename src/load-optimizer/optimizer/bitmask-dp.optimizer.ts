import { OrderDto } from '../dto';

export interface OptimizerInput {
  maxWeightLbs: number;
  maxVolumeCuft: number;
  orders: OrderDto[];
}

export interface OptimizerResult {
  selectedIndices: number[];
  totalPayoutCents: number;
  totalWeightLbs: number;
  totalVolumeCuft: number;
}

function toEpochDay(dateStr: string): number {
  return Math.floor(new Date(dateStr).getTime() / 86_400_000);
}

export function groupOrdersByCompatibility(orders: OrderDto[]): Map<string, OrderDto[]> {
  const groups = new Map<string, OrderDto[]>();

  for (const order of orders) {
    const laneKey = `${order.origin}|${order.destination}|${order.is_hazmat}`;
    const group = groups.get(laneKey);
    if (group) {
      group.push(order);
    } else {
      groups.set(laneKey, [order]);
    }
  }

  return groups;
}

/**
 * Bitmask DP over all 2^n subsets. Each subset is derived in O(1) from a
 * smaller subset by removing the lowest set bit. Typed arrays keep the
 * hot loop cache-friendly so n=22 (~4M states) finishes well under 800ms.
 */
export function findOptimalLoad(input: OptimizerInput): OptimizerResult {
  const { orders, maxWeightLbs, maxVolumeCuft } = input;
  const n = orders.length;

  if (n === 0) {
    return { selectedIndices: [], totalPayoutCents: 0, totalWeightLbs: 0, totalVolumeCuft: 0 };
  }

  const pickupDays = orders.map((o) => toEpochDay(o.pickup_date));
  const deliveryDays = orders.map((o) => toEpochDay(o.delivery_date));

  const totalStates = 1 << n;
  const dpPayout = new Float64Array(totalStates);
  const dpWeight = new Float64Array(totalStates);
  const dpVolume = new Float64Array(totalStates);
  const dpMaxPickup = new Float64Array(totalStates);
  const dpMinDelivery = new Float64Array(totalStates);
  const dpValid = new Uint8Array(totalStates);

  dpValid[0] = 1;
  dpMinDelivery[0] = Number.MAX_SAFE_INTEGER;

  let bestMask = 0;
  let bestPayout = 0;

  for (let mask = 1; mask < totalStates; mask++) {
    const lowestBit = mask & -mask;
    const idx = 31 - Math.clz32(lowestBit);
    const prevMask = mask ^ lowestBit;

    if (!dpValid[prevMask]) continue;

    const newWeight = dpWeight[prevMask] + orders[idx].weight_lbs;
    if (newWeight > maxWeightLbs) continue;

    const newVolume = dpVolume[prevMask] + orders[idx].volume_cuft;
    if (newVolume > maxVolumeCuft) continue;

    const newMaxPickup = Math.max(dpMaxPickup[prevMask], pickupDays[idx]);
    const newMinDelivery = Math.min(dpMinDelivery[prevMask], deliveryDays[idx]);
    if (newMaxPickup > newMinDelivery) continue;

    dpPayout[mask] = dpPayout[prevMask] + orders[idx].payout_cents;
    dpWeight[mask] = newWeight;
    dpVolume[mask] = newVolume;
    dpMaxPickup[mask] = newMaxPickup;
    dpMinDelivery[mask] = newMinDelivery;
    dpValid[mask] = 1;

    if (dpPayout[mask] > bestPayout) {
      bestPayout = dpPayout[mask];
      bestMask = mask;
    }
  }

  const selectedIndices: number[] = [];
  for (let i = 0; i < n; i++) {
    if (bestMask & (1 << i)) {
      selectedIndices.push(i);
    }
  }

  return {
    selectedIndices,
    totalPayoutCents: dpPayout[bestMask],
    totalWeightLbs: dpWeight[bestMask],
    totalVolumeCuft: dpVolume[bestMask],
  };
}
