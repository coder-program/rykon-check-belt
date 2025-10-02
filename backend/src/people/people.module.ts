import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlunosController } from './controllers/alunos.controller';
import { ProfessoresController } from './controllers/professores.controller';
import { FranqueadosController } from './controllers/franqueados.controller';
import { UnidadesController } from './controllers/unidades.controller';
import { AlunosService } from './services/alunos.service';
import { ProfessoresService } from './services/professores.service';
import { FranqueadosService } from './services/franqueados.service';
import { UnidadesService } from './services/unidades.service';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { EnderecosModule } from '../enderecos/enderecos.module';
import { Franqueado } from './entities/franqueado.entity';
import { Unidade } from './entities/unidade.entity';
import { Person } from './entities/person.entity';
import { Aluno } from './entities/aluno.entity';
import { FaixaDef } from '../graduacao/entities/faixa-def.entity';
import { AlunoFaixa } from '../graduacao/entities/aluno-faixa.entity';
import { AlunoFaixaGrau } from '../graduacao/entities/aluno-faixa-grau.entity';
import { ProfessorUnidade } from './entities/professor-unidade.entity';

@Module({
  imports: [
    UsuariosModule,
    TypeOrmModule.forFeature([
      Person,
      Aluno,
      Franqueado,
      Unidade,
      FaixaDef,
      AlunoFaixa,
      AlunoFaixaGrau,
      ProfessorUnidade,
    ]),
    EnderecosModule,
  ],
  controllers: [
    AlunosController,
    ProfessoresController,
    FranqueadosController,
    UnidadesController,
  ],
  providers: [
    AlunosService,
    ProfessoresService,
    FranqueadosService,
    UnidadesService,
  ],
  exports: [
    AlunosService,
    ProfessoresService,
    FranqueadosService,
    UnidadesService,
  ],
})
export class PeopleModule {}
