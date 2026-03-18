import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TimerConfig } from './entities/timer-config.entity';
import { TimerService } from './timer.service';
import { TimerController } from './timer.controller';
import { TimerGateway } from './timer.gateway';

@Module({
  imports: [TypeOrmModule.forFeature([TimerConfig])],
  controllers: [TimerController],
  providers: [TimerService, TimerGateway],
  exports: [TimerService],
})
export class TimerModule {}
