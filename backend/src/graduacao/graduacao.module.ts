import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GraduacaoController } from './graduacao.controller';
import { GraduacaoService } from './graduacao.service';
import { ProgressoController } from './progresso.controller';
import { ProgressoService } from './progresso.service';
import { FaixaDef } from './entities/faixa-def.entity';
import { AlunoFaixa } from './entities/aluno-faixa.entity';
import { AlunoFaixaGrau } from './entities/aluno-faixa-grau.entity';
import { AlunoGraduacao } from './entities/aluno-graduacao.entity';
import { HistoricoGraus } from './entities/historico-graus.entity';
import { HistoricoFaixas } from './entities/historico-faixas.entity';
import { Person } from '../people/entities/person.entity';
import { Aluno } from '../people/entities/aluno.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FaixaDef,
      AlunoFaixa,
      AlunoFaixaGrau,
      AlunoGraduacao,
      HistoricoGraus,
      HistoricoFaixas,
      Person,
      Aluno,
    ]),
  ],
  controllers: [GraduacaoController, ProgressoController],
  providers: [GraduacaoService, ProgressoService],
  exports: [GraduacaoService, ProgressoService],
})
export class GraduacaoModule {}
