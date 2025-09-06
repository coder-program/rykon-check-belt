import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CampanhasController } from './campanhas.controller';
import { CampanhasService } from './campanhas.service';
import { Campanha } from './entities/campanha.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Campanha])],
  controllers: [CampanhasController],
  providers: [CampanhasService],
  exports: [TypeOrmModule],
})
export class CampanhasModule {}
