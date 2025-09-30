import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { Person } from '../people/entities/person.entity';
import { AlunoFaixa } from '../graduacao/entities/aluno-faixa.entity';
import { Presenca } from '../presenca/entities/presenca.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Person, AlunoFaixa, Presenca])],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
