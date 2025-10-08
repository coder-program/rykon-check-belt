import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AulaController } from './aula.controller';
import { AulaService } from './aula.service';
import { Aula } from './entities/aula.entity';
import { Turma } from './entities/turma.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Aula, Turma])],
  controllers: [AulaController],
  providers: [AulaService],
  exports: [AulaService],
})
export class AulaModule {}
