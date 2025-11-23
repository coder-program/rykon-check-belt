import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GraduacaoController } from './graduacao.controller';
import { GraduacaoService } from './graduacao.service';
import { GraduacaoParametrosService } from './graduacao-parametros.service';
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
import { Franqueado } from '../people/entities/franqueado.entity';
import { Unidade } from '../people/entities/unidade.entity';
import { GerenteUnidade } from '../people/entities/gerente-unidade.entity';
import { GraduacaoParametro } from '../people/entities/graduacao-parametro.entity';
import { GraduacaoParametrosController } from '../people/controllers/graduacao-parametros.controller';
import { PeopleModule } from '../people/people.module';

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
      Franqueado,
      Unidade,
      GerenteUnidade,
      GraduacaoParametro,
    ]),
    PeopleModule,
  ],
  controllers: [
    GraduacaoController,
    ProgressoController,
    GraduacaoParametrosController,
  ],
  providers: [GraduacaoService, ProgressoService, GraduacaoParametrosService],
  exports: [GraduacaoService, ProgressoService, GraduacaoParametrosService],
})
export class GraduacaoModule {}
