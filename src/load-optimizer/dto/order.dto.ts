import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsPositive,
  IsBoolean,
  IsDateString,
} from 'class-validator';
import { IsPickupBeforeDelivery } from '../validators/pickup-before-delivery.validator';

export class OrderDto {
  @IsString()
  @IsNotEmpty()
  id!: string;

  @IsInt()
  @IsPositive()
  payout_cents!: number;

  @IsInt()
  @IsPositive()
  weight_lbs!: number;

  @IsInt()
  @IsPositive()
  volume_cuft!: number;

  @IsString()
  @IsNotEmpty()
  origin!: string;

  @IsString()
  @IsNotEmpty()
  destination!: string;

  @IsDateString()
  pickup_date!: string;

  @IsDateString()
  @IsPickupBeforeDelivery()
  delivery_date!: string;

  @IsBoolean()
  is_hazmat!: boolean;
}
