import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompeticoesController } from './competicoes.controller';
import { CompeticoesService } from './competicoes.service';
import { Competicao } from './entities/competicao.entity';
import { AlunoCompeticao } from './entities/aluno-competicao.entity';
import { Aluno } from '../people/entities/aluno.entity';
import { Person } from '../people/entities/person.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Competicao, AlunoCompeticao, Aluno, Person]),
  ],
  controllers: [CompeticoesController],
  providers: [CompeticoesService],
  exports: [CompeticoesService],
})
export class CompeticoesModule {}
