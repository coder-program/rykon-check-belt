import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ModalidadesService } from './modalidades.service';
import { ModalidadesController } from './modalidades.controller';
import { Modalidade } from './entities/modalidade.entity';
import { UnidadeModalidade } from './entities/unidade-modalidade.entity';
import { ModalidadeNivel } from './entities/modalidade-nivel.entity';
import { AlunoModalidadeGraduacao } from './entities/aluno-modalidade-graduacao.entity';
import { AlunoModalidadeGraduacaoHistorico } from './entities/aluno-modalidade-graduacao-historico.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Modalidade,
      UnidadeModalidade,
      ModalidadeNivel,
      AlunoModalidadeGraduacao,
      AlunoModalidadeGraduacaoHistorico,
    ]),
  ],
  controllers: [ModalidadesController],
  providers: [ModalidadesService],
  exports: [ModalidadesService],
})
export class ModalidadesModule {}
