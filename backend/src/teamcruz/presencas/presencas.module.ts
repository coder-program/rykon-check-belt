import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PresencasController } from './presencas.controller';
import { PresencasService } from './presencas.service';
import { Presenca } from './entities/presenca.entity';
import { Aluno } from '../alunos/entities/aluno.entity';
import { Unidade } from '../../people/entities/unidade.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Presenca, Aluno, Unidade])],
  controllers: [PresencasController],
  providers: [PresencasService],
  exports: [TypeOrmModule, PresencasService],
})
export class PresencasModule {}
