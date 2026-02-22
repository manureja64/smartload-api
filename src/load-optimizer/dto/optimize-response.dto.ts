export class OptimizeResponseDto {
  truck_id!: string;
  selected_order_ids!: string[];
  total_payout_cents!: number;
  total_weight_lbs!: number;
  total_volume_cuft!: number;
  utilization_weight_percent!: number;
  utilization_volume_percent!: number;
}
