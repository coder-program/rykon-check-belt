import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { DashboardInstrutorController } from './dashboard-instrutor.controller';
import { DashboardInstrutorService } from './dashboard-instrutor.service';
import { Person } from '../people/entities/person.entity';
import { Aluno } from '../people/entities/aluno.entity';
import { AlunoFaixa } from '../graduacao/entities/aluno-faixa.entity';
import { Presenca } from '../presenca/entities/presenca.entity';
import { Aula } from '../presenca/entities/aula.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Unidade } from '../people/entities/unidade.entity';
import { Franqueado } from '../people/entities/franqueado.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Person,
      Aluno,
      AlunoFaixa,
      Presenca,
      Aula,
      Usuario,
      Unidade,
      Franqueado,
    ]),
  ],
  controllers: [DashboardController, DashboardInstrutorController],
  providers: [DashboardService, DashboardInstrutorService],
  exports: [DashboardService, DashboardInstrutorService],
})
export class DashboardModule {}
