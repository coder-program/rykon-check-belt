import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GraduacaoController } from './graduacao.controller';
import { GraduacaoService } from './graduacao.service';
import { FaixaDef } from './entities/faixa-def.entity';
import { AlunoFaixa } from './entities/aluno-faixa.entity';
import { AlunoFaixaGrau } from './entities/aluno-faixa-grau.entity';
import { AlunoGraduacao } from './entities/aluno-graduacao.entity';
import { Person } from '../people/entities/person.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FaixaDef,
      AlunoFaixa,
      AlunoFaixaGrau,
      AlunoGraduacao,
      Person,
    ]),
  ],
  controllers: [GraduacaoController],
  providers: [GraduacaoService],
  exports: [GraduacaoService],
})
export class GraduacaoModule {}
