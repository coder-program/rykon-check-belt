import { Module } from '@nestjs/common';
import { PaytimeController } from './paytime.controller';
import { PaytimeService } from './paytime.service';

@Module({
  controllers: [PaytimeController],
  providers: [PaytimeService],
  exports: [PaytimeService],
})
export class PaytimeModule {}