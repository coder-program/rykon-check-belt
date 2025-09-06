import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Usuario } from './entities/usuario.entity';
import { Perfil } from './entities/perfil.entity';
import { Permissao } from './entities/permissao.entity';
import { TipoPermissao } from './entities/tipo-permissao.entity';
import { NivelPermissao } from './entities/nivel-permissao.entity';
import { UsuariosService } from './services/usuarios.service';
import { PerfisService } from './services/perfis.service';
import { PermissoesService } from './services/permissoes.service';
import { TiposPermissaoService } from './services/tipos-permissao.service';
import { NiveisPermissaoService } from './services/niveis-permissao.service';
import { UsuariosController } from './controllers/usuarios.controller';
import { PerfisController } from './controllers/perfis.controller';
import { PermissoesController } from './controllers/permissoes.controller';
import { TiposPermissaoController } from './controllers/tipos-permissao.controller';
import { NiveisPermissaoController } from './controllers/niveis-permissao.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Usuario,
      Perfil,
      Permissao,
      TipoPermissao,
      NivelPermissao,
    ]),
  ],
  controllers: [
    UsuariosController,
    PerfisController,
    PermissoesController,
    TiposPermissaoController,
    NiveisPermissaoController,
  ],
  providers: [
    UsuariosService,
    PerfisService,
    PermissoesService,
    TiposPermissaoService,
    NiveisPermissaoService,
  ],
  exports: [
    UsuariosService,
    PerfisService,
    PermissoesService,
    TiposPermissaoService,
    NiveisPermissaoService,
  ],
})
export class UsuariosModule {}
