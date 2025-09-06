import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PresencasController } from './presencas.controller';
import { PresencasService } from './presencas.service';
import { Presenca } from './entities/presenca.entity';
import { Aluno } from '../alunos/entities/aluno.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Presenca, Aluno])],
  controllers: [PresencasController],
  providers: [PresencasService],
  exports: [TypeOrmModule],
})
export class PresencasModule {}
