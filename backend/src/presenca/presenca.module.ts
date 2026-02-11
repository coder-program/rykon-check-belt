import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PresencaController } from './presenca.controller';
import { PresencaService } from './presenca.service';
import { CatracaController } from './catraca.controller';
import { CatracaService } from './catraca.service';
import { Person } from '../people/entities/person.entity';
import { Presenca } from './entities/presenca.entity';
import { Aula } from './entities/aula.entity';
import { Aluno } from '../people/entities/aluno.entity';
import { Responsavel } from '../people/entities/responsavel.entity';
import { AlunoFaixa } from '../graduacao/entities/aluno-faixa.entity';
import { Unidade } from '../people/entities/unidade.entity';
import { GraduacaoModule } from '../graduacao/graduacao.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Person,
      Presenca,
      Aula,
      Aluno,
      Responsavel,
      AlunoFaixa,
      Unidade,
    ]),
    forwardRef(() => GraduacaoModule),
  ],
  controllers: [PresencaController, CatracaController],
  providers: [PresencaService, CatracaService],
  exports: [PresencaService, CatracaService],
})
export class PresencaModule {}
