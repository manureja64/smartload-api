import { Type } from 'class-transformer';
import { ValidateNested, IsArray, ArrayMaxSize } from 'class-validator';
import { TruckDto } from './truck.dto';
import { OrderDto } from './order.dto';

export const MAX_ORDERS = 22;

export class OptimizeRequestDto {
  @ValidateNested()
  @Type(() => TruckDto)
  truck!: TruckDto;

  @IsArray()
  @ArrayMaxSize(MAX_ORDERS)
  @ValidateNested({ each: true })
  @Type(() => OrderDto)
  orders!: OrderDto[];
}
