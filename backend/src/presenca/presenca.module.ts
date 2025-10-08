import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PresencaController } from './presenca.controller';
import { PresencaService } from './presenca.service';
import { Person } from '../people/entities/person.entity';
import { Presenca } from './entities/presenca.entity';
import { Aula } from './entities/aula.entity';
import { Aluno } from '../people/entities/aluno.entity';
import { AlunoFaixa } from '../graduacao/entities/aluno-faixa.entity';
import { GraduacaoModule } from '../graduacao/graduacao.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Person, Presenca, Aula, Aluno, AlunoFaixa]),
    forwardRef(() => GraduacaoModule),
  ],
  controllers: [PresencaController],
  providers: [PresencaService],
  exports: [PresencaService],
})
export class PresencaModule {}
