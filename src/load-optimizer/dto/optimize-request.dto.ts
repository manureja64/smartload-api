import { Type } from 'class-transformer';
import { ValidateNested, IsArray, ArrayMaxSize, IsDefined } from 'class-validator';
import { TruckDto } from './truck.dto';
import { OrderDto } from './order.dto';

export const MAX_ORDERS = 22;

export class OptimizeRequestDto {
  @IsDefined()
  @ValidateNested()
  @Type(() => TruckDto)
  truck!: TruckDto;

  @IsDefined()
  @IsArray()
  @ArrayMaxSize(MAX_ORDERS)
  @ValidateNested({ each: true })
  @Type(() => OrderDto)
  orders!: OrderDto[];
}
