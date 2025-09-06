import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { UsuariosService } from './usuarios/services/usuarios.service';
import { PerfisService } from './usuarios/services/perfis.service';
import { PermissoesService } from './usuarios/services/permissoes.service';
import { TiposPermissaoService } from './usuarios/services/tipos-permissao.service';
import { NiveisPermissaoService } from './usuarios/services/niveis-permissao.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const usuariosService = app.get(UsuariosService);
  const perfisService = app.get(PerfisService);
  const permissoesService = app.get(PermissoesService);
  const tiposPermissaoService = app.get(TiposPermissaoService);
  const niveisPermissaoService = app.get(NiveisPermissaoService);

  try {
    // Criar tipos de permissão
    console.log('Criando tipos de permissão...');

    const tiposPermissao = [
      {
        codigo: 'modulo',
        nome: 'Módulo',
        descricao: 'Permissão de módulo completo',
        ordem: 1,
      },
      {
        codigo: 'funcionalidade',
        nome: 'Funcionalidade',
        descricao: 'Permissão de funcionalidade específica',
        ordem: 2,
      },
      {
        codigo: 'operacao',
        nome: 'Operação',
        descricao: 'Permissão de operação específica',
        ordem: 3,
      },
    ];

    const tiposCriados: any = {};
    for (const tipo of tiposPermissao) {
      try {
        const created = await tiposPermissaoService.create(tipo);
        tiposCriados[tipo.codigo] = created;
        console.log(`✅ Tipo de permissão criado: ${tipo.codigo}`);
      } catch (error) {
        console.log(`ℹ️  Tipo já existe: ${tipo.codigo}`);
        const existing = await tiposPermissaoService.findByCodigo(tipo.codigo);
        tiposCriados[tipo.codigo] = existing;
      }
    }

    // Criar níveis de permissão
    console.log('Criando níveis de permissão...');

    const niveisPermissao = [
      {
        codigo: 'leitura',
        nome: 'Leitura',
        descricao: 'Permite apenas visualizar',
        ordem: 1,
        cor: '#28a745', // Verde
      },
      {
        codigo: 'escrita',
        nome: 'Escrita',
        descricao: 'Permite criar e editar',
        ordem: 2,
        cor: '#ffc107', // Amarelo
      },
      {
        codigo: 'exclusao',
        nome: 'Exclusão',
        descricao: 'Permite deletar',
        ordem: 3,
        cor: '#fd7e14', // Laranja
      },
      {
        codigo: 'administracao',
        nome: 'Administração',
        descricao: 'Acesso administrativo completo',
        ordem: 4,
        cor: '#dc3545', // Vermelho
      },
    ];

    const niveisCriados: any = {};
    for (const nivel of niveisPermissao) {
      try {
        const created = await niveisPermissaoService.create(nivel);
        niveisCriados[nivel.codigo] = created;
        console.log(`✅ Nível de permissão criado: ${nivel.codigo}`);
      } catch (error) {
        console.log(`ℹ️  Nível já existe: ${nivel.codigo}`);
        const existing = await niveisPermissaoService.findByCodigo(
          nivel.codigo,
        );
        niveisCriados[nivel.codigo] = existing;
      }
    }

    // Criar permissões básicas
    console.log('Criando permissões básicas...');

    const permissoes = [
      {
        codigo: 'usuarios.read',
        nome: 'Visualizar Usuários',
        descricao: 'Permissão para visualizar usuários',
        tipoId: tiposCriados.funcionalidade.id,
        nivelId: niveisCriados.leitura.id,
        modulo: 'usuarios',
      },
      {
        codigo: 'usuarios.create',
        nome: 'Criar Usuários',
        descricao: 'Permissão para criar usuários',
        tipoId: tiposCriados.funcionalidade.id,
        nivelId: niveisCriados.escrita.id,
        modulo: 'usuarios',
      },
      {
        codigo: 'usuarios.update',
        nome: 'Atualizar Usuários',
        descricao: 'Permissão para atualizar usuários',
        tipoId: tiposCriados.operacao.id,
        nivelId: niveisCriados.escrita.id,
        modulo: 'usuarios',
      },
      {
        codigo: 'usuarios.delete',
        nome: 'Deletar Usuários',
        descricao: 'Permissão para deletar usuários',
        tipoId: tiposCriados.operacao.id,
        nivelId: niveisCriados.exclusao.id,
        modulo: 'usuarios',
      },
      {
        codigo: 'permissoes.read',
        nome: 'Visualizar Permissões',
        descricao: 'Permissão para visualizar permissões',
        tipoId: tiposCriados.funcionalidade.id,
        nivelId: niveisCriados.leitura.id,
        modulo: 'permissoes',
      },
      {
        codigo: 'admin.all',
        nome: 'Acesso Total',
        descricao: 'Acesso total ao sistema',
        tipoId: tiposCriados.modulo.id,
        nivelId: niveisCriados.administracao.id,
        modulo: 'sistema',
      },
    ];

    for (const permissao of permissoes) {
      try {
        await permissoesService.create(permissao);
        console.log(`✅ Permissão criada: ${permissao.codigo}`);
      } catch (error) {
        console.log(`ℹ️  Permissão já existe: ${permissao.codigo}`);
      }
    }

    // Criar perfil admin
    console.log('Criando perfil administrador...');
    let perfilAdmin;
    try {
      perfilAdmin = await perfisService.create({
        nome: 'Administrador',
        descricao: 'Perfil com acesso total ao sistema',
      });
      console.log('✅ Perfil Administrador criado');
    } catch (error) {
      console.log('ℹ️  Perfil Administrador já existe');
      // Buscar perfil existente
      const perfis = await perfisService.findAll();
      perfilAdmin = perfis.find((p) => p.nome === 'Administrador');
    }

    // Criar usuário admin
    console.log('Criando usuário administrador...');
    try {
      await usuariosService.create({
        username: 'admin',
        email: 'admin@sistema.com',
        password: 'admin123',
        nome: 'Administrador do Sistema',
        cpf: '12345678901',
        telefone: '11999999999',
        perfil_ids: perfilAdmin ? [perfilAdmin.id] : [],
      });
      console.log('✅ Usuário admin criado');
    } catch (error) {
      console.log('ℹ️  Usuário admin já existe');
    }

    console.log('\n🎉 Seed executado com sucesso!');
    console.log('👤 Usuário: admin');
    console.log('🔑 Senha: admin123');
  } catch (error) {
    console.error('❌ Erro ao executar seed:', error);
  }

  await app.close();
}

bootstrap();
