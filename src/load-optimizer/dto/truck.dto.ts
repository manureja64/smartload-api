import { IsString, IsNotEmpty, IsInt, IsPositive } from 'class-validator';

export class TruckDto {
  @IsString()
  @IsNotEmpty()
  id!: string;

  @IsInt()
  @IsPositive()
  max_weight_lbs!: number;

  @IsInt()
  @IsPositive()
  max_volume_cuft!: number;
}
