import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlunosController } from './controllers/alunos.controller';
import { ProfessoresController } from './controllers/professores.controller';
import { FranqueadosController } from './controllers/franqueados.controller';
import { UnidadesController } from './controllers/unidades.controller';
import { RecepcionistaUnidadesController } from './controllers/recepcionista-unidades.controller';
import { AlunosService } from './services/alunos.service';
import { ProfessoresService } from './services/professores.service';
import { FranqueadosService } from './services/franqueados.service';
import { UnidadesService } from './services/unidades.service';
import { RecepcionistaUnidadesService } from './services/recepcionista-unidades.service';
import { ResponsaveisService } from './services/responsaveis.service';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { EnderecosModule } from '../enderecos/enderecos.module';
import { Franqueado } from './entities/franqueado.entity';
import { Unidade } from './entities/unidade.entity';
import { Person } from './entities/person.entity';
import { Aluno } from './entities/aluno.entity';
import { Responsavel } from './entities/responsavel.entity';
import { FaixaDef } from '../graduacao/entities/faixa-def.entity';
import { AlunoFaixa } from '../graduacao/entities/aluno-faixa.entity';
import { AlunoFaixaGrau } from '../graduacao/entities/aluno-faixa-grau.entity';
import { ProfessorUnidade } from './entities/professor-unidade.entity';
import { RecepcionistaUnidade } from './entities/recepcionista-unidade.entity';

@Module({
  imports: [
    UsuariosModule,
    TypeOrmModule.forFeature([
      Person,
      Aluno,
      Responsavel,
      Franqueado,
      Unidade,
      FaixaDef,
      AlunoFaixa,
      AlunoFaixaGrau,
      ProfessorUnidade,
      RecepcionistaUnidade,
    ]),
    EnderecosModule,
  ],
  controllers: [
    AlunosController,
    ProfessoresController,
    FranqueadosController,
    UnidadesController,
    RecepcionistaUnidadesController,
  ],
  providers: [
    AlunosService,
    ProfessoresService,
    FranqueadosService,
    UnidadesService,
    RecepcionistaUnidadesService,
    ResponsaveisService,
  ],
  exports: [
    AlunosService,
    ProfessoresService,
    FranqueadosService,
    UnidadesService,
    RecepcionistaUnidadesService,
    ResponsaveisService,
  ],
})
export class PeopleModule {}
