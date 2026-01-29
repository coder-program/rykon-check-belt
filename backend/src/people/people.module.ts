import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlunosController } from './controllers/alunos.controller';
import { ProfessoresController } from './controllers/professores.controller';
import { FranqueadosController } from './controllers/franqueados.controller';
import { UnidadesController } from './controllers/unidades.controller';
import { RecepcionistaUnidadesController } from './controllers/recepcionista-unidades.controller';
import { GerenteUnidadesController } from './controllers/gerente-unidades.controller';
import { ConviteCadastroController } from './convite-cadastro.controller';
import { ContratosController } from './controllers/contratos.controller';
import { AlunosService } from './services/alunos.service';
import { ProfessoresService } from './services/professores.service';
import { FranqueadosService } from './services/franqueados.service';
import { UnidadesService } from './services/unidades.service';
import { RecepcionistaUnidadesService } from './services/recepcionista-unidades.service';
import { ResponsaveisService } from './services/responsaveis.service';
import { GerenteUnidadesService } from './services/gerente-unidades.service';
import { ConviteCadastroService } from './convite-cadastro.service';
import { ContratosService } from './services/contratos.service';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { EnderecosModule } from '../enderecos/enderecos.module';
import { Franqueado } from './entities/franqueado.entity';
import { Franqueado as FranqueadoSimplified } from './entities/franqueado-simplified.entity';
import { Unidade } from './entities/unidade.entity';
import { Person } from './entities/person.entity';
import { Aluno } from './entities/aluno.entity';
import { Responsavel } from './entities/responsavel.entity';
import { FaixaDef } from '../graduacao/entities/faixa-def.entity';
import { AlunoFaixa } from '../graduacao/entities/aluno-faixa.entity';
import { AlunoFaixaGrau } from '../graduacao/entities/aluno-faixa-grau.entity';
import { ProfessorUnidade } from './entities/professor-unidade.entity';
import { RecepcionistaUnidade } from './entities/recepcionista-unidade.entity';
import { GerenteUnidade } from './entities/gerente-unidade.entity';
import { AlunoUnidade } from './entities/aluno-unidade.entity';
import { AlunoModalidade } from './entities/aluno-modalidade.entity';
import { ConviteCadastro } from './entities/convite-cadastro.entity';
import { ContratoUnidade } from './entities/contrato-unidade.entity';
import { ContratoAssinaturaHistorico } from './entities/contrato-assinatura-historico.entity';
import { AlunoUnidadeService } from './services/aluno-unidade.service';
import { AlunoModalidadeService } from './services/aluno-modalidade.service';
import { Modalidade } from '../modalidades/entities/modalidade.entity';
import { Endereco } from '../enderecos/endereco.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { AlunoConvenio } from '../financeiro/entities/aluno-convenio.entity';
import { Convenio } from '../financeiro/entities/convenio.entity';

@Module({
  imports: [
    forwardRef(() => UsuariosModule),
    TypeOrmModule.forFeature([
      Person,
      Aluno,
      Responsavel,
      Franqueado,
      FranqueadoSimplified,
      Unidade,
      FaixaDef,
      AlunoFaixa,
      AlunoFaixaGrau,
      ProfessorUnidade,
      RecepcionistaUnidade,
      GerenteUnidade,
      AlunoUnidade,
      AlunoModalidade,
      Modalidade,
      ConviteCadastro,
      ContratoUnidade,
      ContratoAssinaturaHistorico,
      Endereco,
      Usuario,
      AlunoConvenio,
      Convenio,
    ]),
    EnderecosModule,
  ],
  controllers: [
    AlunosController,
    ProfessoresController,
    FranqueadosController,
    UnidadesController,
    RecepcionistaUnidadesController,
    GerenteUnidadesController,
    ConviteCadastroController,
    ContratosController,
  ],
  providers: [
    AlunosService,
    ProfessoresService,
    FranqueadosService,
    UnidadesService,
    RecepcionistaUnidadesService,
    GerenteUnidadesService,
    ResponsaveisService,
    AlunoUnidadeService,
    AlunoModalidadeService,
    ConviteCadastroService,
    ContratosService,
  ],
  exports: [
    AlunosService,
    ProfessoresService,
    FranqueadosService,
    UnidadesService,
    RecepcionistaUnidadesService,
    GerenteUnidadesService,
    ResponsaveisService,
    AlunoModalidadeService,
    ConviteCadastroService,
    ContratosService,
  ],
})
export class PeopleModule {}
