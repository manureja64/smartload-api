import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { LoadOptimizerService } from './load-optimizer.service';
import { OptimizeRequestDto, OptimizeResponseDto } from './dto';

@Controller('api/v1/load-optimizer')
export class LoadOptimizerController {
  constructor(private readonly optimizerService: LoadOptimizerService) {}

  @Post('optimize')
  @HttpCode(200)
  optimize(@Body() request: OptimizeRequestDto): OptimizeResponseDto {
    return this.optimizerService.optimize(request);
  }
}
