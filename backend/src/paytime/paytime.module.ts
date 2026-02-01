import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaytimeController } from './paytime.controller';
import { PaytimeService } from './paytime.service';
import { Unidade } from '../people/entities/unidade.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Unidade])],
  controllers: [PaytimeController],
  providers: [PaytimeService],
  exports: [PaytimeService],
})
export class PaytimeModule {}