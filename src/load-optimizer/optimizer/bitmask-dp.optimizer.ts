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
 * smaller subset by removing the lowest set bit. Flat typed arrays avoid
 * object-property lookups in the hot loop and keep memory cache-friendly,
 * so n=22 (~4M states) finishes well under 800ms.
 */
export function findOptimalLoad(input: OptimizerInput): OptimizerResult {
  const { orders, maxWeightLbs, maxVolumeCuft } = input;
  const n = orders.length;

  if (n === 0) {
    return { selectedIndices: [], totalPayoutCents: 0, totalWeightLbs: 0, totalVolumeCuft: 0 };
  }

  // Pre-extract into flat arrays to avoid object lookups in the hot loop
  const oWeight = new Int32Array(n);
  const oVolume = new Int32Array(n);
  const oPayout = new Float64Array(n);
  const oPickup = new Int32Array(n);
  const oDelivery = new Int32Array(n);

  for (let i = 0; i < n; i++) {
    oWeight[i] = orders[i].weight_lbs;
    oVolume[i] = orders[i].volume_cuft;
    oPayout[i] = orders[i].payout_cents;
    oPickup[i] = toEpochDay(orders[i].pickup_date);
    oDelivery[i] = toEpochDay(orders[i].delivery_date);
  }

  const totalStates = 1 << n;
  const dpWeight = new Int32Array(totalStates);
  const dpVolume = new Int32Array(totalStates);
  const dpPayout = new Float64Array(totalStates);
  const dpMaxPickup = new Int32Array(totalStates);
  const dpMinDelivery = new Int32Array(totalStates);
  const dpValid = new Uint8Array(totalStates);

  dpValid[0] = 1;
  dpMinDelivery[0] = 0x7fffffff;

  let bestMask = 0;
  let bestPayout = 0;

  for (let mask = 1; mask < totalStates; mask++) {
    const lowestBit = mask & -mask;
    const idx = 31 - Math.clz32(lowestBit);
    const prev = mask ^ lowestBit;

    if (!dpValid[prev]) continue;

    const w = dpWeight[prev] + oWeight[idx];
    if (w > maxWeightLbs) continue;

    const v = dpVolume[prev] + oVolume[idx];
    if (v > maxVolumeCuft) continue;

    const pickup = dpMaxPickup[prev] > oPickup[idx] ? dpMaxPickup[prev] : oPickup[idx];
    const delivery = dpMinDelivery[prev] < oDelivery[idx] ? dpMinDelivery[prev] : oDelivery[idx];
    if (pickup > delivery) continue;

    dpWeight[mask] = w;
    dpVolume[mask] = v;
    dpPayout[mask] = dpPayout[prev] + oPayout[idx];
    dpMaxPickup[mask] = pickup;
    dpMinDelivery[mask] = delivery;
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
