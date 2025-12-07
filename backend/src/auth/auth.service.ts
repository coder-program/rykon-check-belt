import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { UsuariosService } from '../usuarios/services/usuarios.service';
import { PerfisService } from '../usuarios/services/perfis.service';
import { AlunosService } from '../people/services/alunos.service';
import { ProfessoresService } from '../people/services/professores.service';
import { ResponsaveisService } from '../people/services/responsaveis.service';
import { UnidadesService } from '../people/services/unidades.service';
import { GerenteUnidadesService } from '../people/services/gerente-unidades.service';
import { RecepcionistaUnidadesService } from '../people/services/recepcionista-unidades.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/entities/audit-log.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { PasswordReset } from './entities/password-reset.entity';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { EmailService } from '../email/email.service';
import * as crypto from 'crypto';

export interface JwtPayload {
  sub: string;
  username: string;
  email: string;
  permissions: string[];
}

export interface PermissionDetail {
  codigo: string;
  nome: string;
  descricao: string;
  modulo: string;
  nivel: {
    nome: string;
    descricao: string;
    cor: string;
  };
  tipo: {
    nome: string;
    descricao: string;
  };
}

export interface LoginResponse {
  access_token: string;
  user: {
    id: string;
    username: string;
    email: string;
    nome: string;
    cpf?: string; // ✅ Adicionar CPF (opcional pois pode não estar cadastrado)
    telefone?: string;
    data_nascimento?: string;
    foto?: string;
    ativo?: boolean;
    unidade_id?: string; // ✅ Adicionar unidade_id para gerentes e recepcionistas
    cadastro_completo: boolean;
    permissions: string[];
    permissionsDetail: PermissionDetail[];
    perfis: string[];
  };
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(PasswordReset)
    private passwordResetRepository: Repository<PasswordReset>,
    private usuariosService: UsuariosService,
    private jwtService: JwtService,
    private perfisService: PerfisService,
    private alunosService: AlunosService,
    private professoresService: ProfessoresService,
    private responsaveisService: ResponsaveisService,
    private unidadesService: UnidadesService,
    private gerenteUnidadesService: GerenteUnidadesService,
    private recepcionistaUnidadesService: RecepcionistaUnidadesService,
    private dataSource: DataSource,
    private auditService: AuditService,
    private emailService: EmailService,
  ) {}

  private ACCESS_TTL_SEC = 60 * 60 * 8; // 8 horas (mais tempo para evitar expiração rápida)
  private REFRESH_TTL_MS = 1000 * 60 * 60 * 24 * 60; // 60 dias

  async validateUser(
    emailOrUsername: string,
    pass: string,
  ): Promise<
    { user: Usuario; error?: string } | { user: null; error: string }
  > {
    try {
      // Usa findByEmailOrUsername - aceita email OU username
      const user =
        await this.usuariosService.findByEmailOrUsername(emailOrUsername);

      if (!user) {
        return {
          user: null,
          error:
            'Email ou username não encontrado. Verifique suas credenciais ou cadastre-se primeiro.',
        };
      }

      // Verificar se usuário está inativo
      if (!user.ativo) {
        // Se o cadastro NÃO está completo, permitir login para completar o cadastro
        if (!user.cadastro_completo) {
          // Permite login mas o frontend vai redirecionar para /complete-profile
          return { user };
        }

        // Se o cadastro JÁ está completo mas usuário está inativo = aguardando aprovação
        return {
          user: null,
          error:
            'Sua conta está inativa. Entre em contato com o administrador.',
        };
      }

      const passwordValid = await this.usuariosService.validatePassword(
        pass,
        user.password,
      );

      if (!passwordValid) {
        return {
          user: null,
          error: 'Senha incorreta. Verifique sua senha e tente novamente.',
        };
      }

      // Atualizar último login
      await this.usuariosService.updateUltimoLogin(user.id);
      return { user };
    } catch (error) {
      console.error(' Erro ao validar usuário:', error);
      return {
        user: null,
        error: 'Erro interno do servidor. Tente novamente mais tarde.',
      };
    }
  }

  async login(
    user: Usuario,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<LoginResponse> {
    const permissions = await this.usuariosService.getUserPermissions(user.id);
    const permissionsDetail =
      await this.usuariosService.getUserPermissionsDetail(user.id);
    const perfis = await this.usuariosService.getUserPerfis(user.id);

    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      email: user.email,
      permissions,
    };

    let cadastroCompleto = user.cadastro_completo || false;
    let unidade_id: string | undefined = undefined;

    // Verificar se é franqueado e se está em homologação
    const isFranqueado = perfis.some(
      (p: any) =>
        (typeof p === 'string' && p.toLowerCase() === 'franqueado') ||
        (typeof p === 'object' && p?.nome?.toLowerCase() === 'franqueado'),
    );

    if (isFranqueado) {
      try {
        const FranqueadosServiceSimplified =
          require('../people/services/franqueados-simplified.service').FranqueadosServiceSimplified;
        const franqueadosService = new FranqueadosServiceSimplified(
          this.dataSource,
        );
        const franqueado = await franqueadosService.getByUsuarioId(user.id);

        // Se franqueado está EM_HOMOLOGACAO, forçar cadastro incompleto
        if (franqueado && franqueado.situacao === 'EM_HOMOLOGACAO') {
          cadastroCompleto = false;
        }
      } catch (error) {
        console.error('Erro ao verificar situação do franqueado:', error);
      }
    }

    // Buscar unidade_id do gerente se existir
    try {
      const gerente_unidade =
        await this.gerenteUnidadesService.buscarPorUsuario(user.id);
      if (gerente_unidade && gerente_unidade.unidade_id) {
        unidade_id = gerente_unidade.unidade_id;
      }
    } catch (error) {
      console.error(` [LOGIN] Erro ao buscar gerente:`, error);
    }

    // Buscar unidade_id do recepcionista se existir
    if (!unidade_id) {
      try {
        const vinculos = await this.recepcionistaUnidadesService.list({
          usuario_id: user.id,
          ativo: true,
        });
        if (vinculos && vinculos.length > 0) {
          unidade_id = vinculos[0].unidade_id;
        }
      } catch (error) {
        console.error(` [LOGIN] Erro ao buscar recepcionista:`, error);
      }
    }

    // Registrar LOGIN na auditoria
    /* try {
      await this.auditService.log({
        action: AuditAction.LOGIN,
        entityName: 'auth',
        entityId: user.id,
        userId: user.id,
        username: user.username,
        ipAddress: ipAddress || 'unknown',
        userAgent: userAgent || 'unknown',
        description: `Usuário ${user.username} (${user.nome}) fez login no sistema`,
      });
    } catch (error) {
      console.error('Erro ao registrar auditoria de login:', error);
    } */

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        nome: user.nome,
        cpf: user.cpf, // ✅ Adicionar CPF para uso no frontend
        telefone: user.telefone,
        data_nascimento: user.data_nascimento
          ? user.data_nascimento instanceof Date
            ? user.data_nascimento.toISOString().split('T')[0]
            : String(user.data_nascimento).split('T')[0]
          : undefined,
        foto: user.foto,
        ativo: user.ativo,
        unidade_id: unidade_id, // ✅ Adicionar unidade_id do gerente ou recepcionista
        cadastro_completo: cadastroCompleto,
        permissions,
        permissionsDetail,
        perfis,
      },
    };
  }

  async validateToken(
    payload: JwtPayload,
    allowInactive = false,
  ): Promise<any | null> {
    const user = await this.usuariosService.findOne(payload.sub);

    if (!user) {
      console.error(' [validateToken] Usuário não encontrado');
      return null;
    }

    // Se allowInactive = false (padrão), rejeita usuários inativos
    if (!allowInactive && !user.ativo) {
      console.error(' [validateToken] Usuário inativo e allowInactive = false');
      return null;
    }

    // Incluir dados do aluno se existir
    let aluno: any = null;
    try {
      aluno = await this.alunosService.findByUsuarioId(user.id);
    } catch (error) {}

    // Incluir dados do professor se existir
    let professor: any = null;
    try {
      professor = await this.professoresService.findByUsuarioId(user.id);
    } catch (error) {}

    // Incluir dados do gerente_unidade se existir
    let gerente_unidade: any = null;
    try {
      gerente_unidade = await this.gerenteUnidadesService.buscarPorUsuario(
        user.id,
      );
    } catch (error) {}

    // Incluir dados do recepcionista se existir
    let recepcionista_unidades: any = null;
    try {
      const vinculos = await this.recepcionistaUnidadesService.list({
        usuario_id: user.id,
        ativo: true,
      });
      if (vinculos && vinculos.length > 0) {
        // Pega o primeiro vínculo ativo (normalmente recepcionistas têm apenas 1 unidade)
        recepcionista_unidades = vinculos[0];
      }
    } catch (error) {}

    // Incluir dados do franqueado se existir
    let franqueado: any = null;
    try {
      const FranqueadosServiceSimplified =
        require('../people/services/franqueados-simplified.service').FranqueadosServiceSimplified;
      const franqueadosService = new FranqueadosServiceSimplified(
        this.dataSource,
      );
      franqueado = await franqueadosService.getByUsuarioId(user.id);
    } catch (error) {}

    const userData = {
      ...user,
      perfis: user.perfis, // Já vem como objetos com { id, nome, etc }
      aluno: aluno
        ? {
            id: aluno.id,
            nome_completo: aluno.nome_completo,
            unidade_id: aluno.unidade_id,
            faixa_atual: aluno.faixa_atual,
            status: aluno.status,
          }
        : null,
      professor: professor
        ? {
            id: professor.id,
            nome_completo: professor.nome_completo,
            unidade_id: professor.unidade_id,
            especialidades: professor.especialidades,
          }
        : null,
      gerente_unidade: gerente_unidade
        ? {
            id: gerente_unidade.id,
            unidade_id: gerente_unidade.unidade_id,
            cargo: gerente_unidade.cargo,
            ativo: gerente_unidade.ativo,
          }
        : null,
      recepcionista_unidade: recepcionista_unidades
        ? {
            id: recepcionista_unidades.id,
            unidade_id: recepcionista_unidades.unidade_id,
            cargo: recepcionista_unidades.cargo,
            turno: recepcionista_unidades.turno,
          }
        : null,
      franqueado: franqueado
        ? {
            id: franqueado.id,
            nome: franqueado.nome,
            cpf: franqueado.cpf,
            email: franqueado.email,
            telefone: franqueado.telefone,
            situacao: franqueado.situacao,
            unidades_gerencia: franqueado.unidades_gerencia,
            total_unidades: franqueado.total_unidades,
          }
        : null,
    };

    // Remover password do retorno para segurança
    const { password, ...userDataWithoutPassword } = userData;

    return userDataWithoutPassword;
  }

  async refreshToken(user: Usuario): Promise<LoginResponse> {
    return this.login(user);
  }

  issueRefreshToken(userId: string) {
    const { refreshTokenStore } = require('./refresh-token.store');
    const token = refreshTokenStore.create(userId, this.REFRESH_TTL_MS);
    return token;
  }

  rotateRefresh(oldToken: string) {
    const { refreshTokenStore } = require('./refresh-token.store');
    return refreshTokenStore.rotate(oldToken, this.REFRESH_TTL_MS);
  }

  async getUserProfile(userId: string) {
    const user = await this.usuariosService.findOne(userId);

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const permissions = await this.usuariosService.getUserPermissions(userId);
    const permissionsDetail =
      await this.usuariosService.getUserPermissionsDetail(userId);
    const perfis = await this.usuariosService.getUserPerfis(userId);

    // Buscar unidade do usuário (se for gerente ou tiver unidade vinculada)
    let unidade: any = null;
    try {
      // Verificar se é gerente através dos perfis
      const isGerenteUnidade = perfis.some(
        (p: string) => p.toLowerCase() === 'gerente_unidade',
      );

      if (user.id && isGerenteUnidade) {
        // Buscar unidade do gerente via tabela gerente_unidades
        const query = `
          SELECT u.id, u.nome, u.cnpj, u.status
          FROM teamcruz.gerente_unidades gu
          INNER JOIN teamcruz.unidades u ON u.id = gu.unidade_id
          WHERE gu.usuario_id = $1 AND gu.ativo = true
          LIMIT 1
        `;
        const result = await this.usuariosService['dataSource'].query(query, [
          user.id,
        ]);
        if (result && result.length > 0) {
          unidade = result[0];
        }
      }
    } catch (error: any) {}

    // Remover senha do retorno
    const { password, ...userWithoutPassword } = user;

    const result = {
      ...userWithoutPassword,
      permissions,
      permissionsDetail,
      perfis,
      unidade,
    };

    return result;
  }

  async completeProfile(userId: string, profileData: any) {
    const user = await this.usuariosService.findOne(userId);
    if (!user) {
      console.error(' [completeProfile] Usuário não encontrado');
      throw new NotFoundException('Usuário não encontrado');
    }

    if (user.cadastro_completo) {
      console.error(' [completeProfile] Cadastro já foi completado');
      throw new BadRequestException('Cadastro já foi completado');
    }

    const perfis = await this.usuariosService.getUserPerfis(userId);
    const perfilPrincipal = perfis[0]?.toLowerCase();

    try {
      // Completar cadastro baseado no perfil
      if (perfilPrincipal === 'aluno') {
        // Função para limpar campos vazios/nulos/undefined
        const cleanEmptyFields = (obj: any) => {
          const cleaned = {};
          for (const [key, value] of Object.entries(obj)) {
            if (value !== null && value !== undefined && value !== '') {
              cleaned[key] = value;
            }
          }
          return cleaned;
        };

        const alunoDataRaw = {
          // Dados pessoais
          nome_completo: user.nome,
          cpf: user.cpf,
          data_nascimento: profileData.data_nascimento || user.data_nascimento,
          genero: profileData.genero || 'OUTRO',

          // Contato
          email: user.email,
          telefone: user.telefone,
          telefone_emergencia: profileData.telefone_emergencia,
          nome_contato_emergencia: profileData.nome_contato_emergencia,

          // Matrícula
          usuario_id: userId, // Vincular ao usuário
          unidade_id: profileData.unidade_id,
          status: 'ATIVO', // Aluno ativo por padrão no cadastro
          data_matricula: new Date().toISOString().split('T')[0],

          // Graduação
          faixa_atual: profileData.faixa_atual || 'BRANCA',
          graus: profileData.graus || 0,

          // Dados médicos
          observacoes_medicas: profileData.observacoes_medicas,
          alergias: profileData.alergias,
          medicamentos_uso_continuo: profileData.medicamentos_uso_continuo,
          plano_saude: profileData.plano_saude,
          atestado_medico_validade: profileData.atestado_medico_validade,
          restricoes_medicas: profileData.restricoes_medicas,

          // Responsável (para menores)
          responsavel_nome: profileData.responsavel_nome,
          responsavel_cpf: profileData.responsavel_cpf,
          responsavel_telefone: profileData.responsavel_telefone,
          responsavel_parentesco: profileData.responsavel_parentesco,

          // Dados financeiros
          dia_vencimento: profileData.dia_vencimento,
          valor_mensalidade: profileData.valor_mensalidade,
          desconto_percentual: profileData.desconto_percentual || 0,

          // Consentimentos LGPD
          consent_lgpd: profileData.consent_lgpd || false,
          consent_imagem: profileData.consent_imagem || false,
          consent_lgpd_date: profileData.consent_lgpd ? new Date() : null,

          // Outros
          observacoes: profileData.observacoes,
          foto_url: profileData.foto_url,
        };

        // Limpar campos vazios antes de enviar para o banco
        const alunoData = cleanEmptyFields(alunoDataRaw);
        try {
          const alunoCreated = await this.alunosService.create(
            alunoData as any,
          );
        } catch (alunoError) {
          console.error(' [completeProfile] ERRO ao criar aluno:', alunoError);
          console.error(' [completeProfile] Stack trace:', alunoError.stack);
          throw alunoError;
        }
      } else if (
        perfilPrincipal === 'professor' ||
        perfilPrincipal === 'instrutor'
      ) {
        // Criar registro de professor
        const professorData = {
          tipo_cadastro: 'PROFESSOR',
          nome_completo: user.nome,
          cpf: user.cpf,
          email: user.email,
          telefone: user.telefone,
          data_nascimento: profileData.data_nascimento,
          genero: profileData.genero || 'OUTRO',
          status: 'INATIVO', // Aguarda aprovação
          unidade_id: profileData.unidade_id, // Unidade principal
          faixa_ministrante: profileData.faixa_atual || 'AZUL', // Mapeando faixa_atual para faixa_ministrante
          especialidades: profileData.especialidades || [],
          observacoes: profileData.observacoes,
          usuario_id: userId, // Vincular ao usuário
        };

        await this.professoresService.create(professorData as any);
      }

      // Se for RESPONSAVEL, criar registro na tabela responsaveis
      if (perfilPrincipal === 'responsavel') {
        const responsavelData = {
          usuario_id: userId,
          nome_completo: user.nome,
          cpf: user.cpf,
          email: user.email,
          telefone: user.telefone,
          data_nascimento: profileData.data_nascimento,
          genero: profileData.genero || 'MASCULINO',
          // Campos de endereço (opcionais)
          cep: profileData.cep,
          logradouro: profileData.logradouro,
          numero: profileData.numero,
          complemento: profileData.complemento,
          bairro: profileData.bairro,
          cidade: profileData.cidade,
          estado: profileData.estado,
          pais: profileData.pais || 'Brasil',
          // Campos profissionais (opcionais)
          profissao: profileData.profissao,
          empresa: profileData.empresa,
          renda_familiar: profileData.renda_familiar,
          observacoes: profileData.observacoes,
          ativo: false, // Aguarda aprovação do admin
        };

        await this.responsaveisService.create(responsavelData as any);
      }

      // Se for GERENTE_UNIDADE, garantir que está vinculado à unidade correta
      if (
        perfilPrincipal === 'gerente_unidade' ||
        perfilPrincipal === 'gerente'
      ) {
        // Verificar se gerente já está vinculado via tabela gerente_unidades
        const vinculoExistente = await this.dataSource.query(
          `SELECT unidade_id FROM teamcruz.gerente_unidades
           WHERE usuario_id = $1 AND ativo = true LIMIT 1`,
          [userId],
        );

        if (profileData.unidade_id) {
          console.warn(
            `⚠️ [completeProfile] Gerente não estava vinculado. Vinculando à unidade: ${profileData.unidade_id}`,
          );
          // Vincular gerente à unidade via tabela gerente_unidades
          await this.dataSource.query(
            `INSERT INTO teamcruz.gerente_unidades (usuario_id, unidade_id, ativo, data_vinculo)
             VALUES ($1, $2, true, NOW())
             ON CONFLICT (usuario_id) DO UPDATE SET unidade_id = $2, ativo = true`,
            [userId, profileData.unidade_id],
          );
        } else {
          console.warn(
            `⚠️ [completeProfile] Gerente ${user.nome} SEM UNIDADE DEFINIDA!`,
          );
        }
      }

      // Atualizar cadastro como completo
      // TODOS os usuários ficam INATIVOS até aprovação do admin
      await this.usuariosService.update(userId, {
        cadastro_completo: true,
        ativo: false, // Sempre inativo - aguarda aprovação do admin
      } as any);

      return {
        message:
          'Cadastro completado com sucesso! Aguarde a aprovação do administrador para acessar o sistema.',
        success: true,
        status: 'aguardando_aprovacao',
      };
    } catch (error) {
      console.error('Erro ao completar cadastro:', error);
      throw new BadRequestException(
        error.message || 'Erro ao completar cadastro',
      );
    }
  }

  async registerAluno(payload: any) {
    // Determinar perfil: usa perfil_id se fornecido, caso contrário usa "aluno" por padrão
    let perfilId: string = ''; // Inicializar vazio
    let perfilNome: string = 'aluno'; // Padrão aluno
    let usuarioAtivo = false; // INATIVO até completar cadastro (tanto para aluno quanto outros perfis)

    // Validar se perfil_id é um UUID válido (formato: 8-4-4-4-12 caracteres hexadecimais)
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    let perfilValido = false;

    // Tentar usar o perfil_id fornecido se for um UUID válido
    if (payload.perfil_id && uuidRegex.test(payload.perfil_id)) {
      try {
        const perfilEscolhido = await this.perfisService.findOne(
          payload.perfil_id,
        );
        if (perfilEscolhido) {
          perfilId = payload.perfil_id;
          perfilNome = perfilEscolhido.nome.toLowerCase();
          perfilValido = true;

          // VALIDAÇÃO DE SEGURANÇA: Perfis elevados requerem aprovação
          const perfisQueRequeremAprovacao = [
            'instrutor',
            'professor',
            'gerente_unidade',
            'franqueado',
            'master',
          ];

          if (perfisQueRequeremAprovacao.includes(perfilNome)) {
            // Usuário criado como INATIVO até ser aprovado por um admin
            usuarioAtivo = false;
          }
        } else {
          console.warn(
            `⚠️  Perfil não encontrado: ${payload.perfil_id}. Usando "aluno" como padrão.`,
          );
        }
      } catch (error) {
        console.error(`Erro ao buscar perfil: ${error.message}`);
      }
    }

    // Se não tem perfil válido, usa "aluno" como padrão
    if (!perfilValido) {
      let perfilAluno = await this.perfisService.findByName('aluno');
      if (!perfilAluno) {
        perfilAluno = await this.perfisService.create({
          nome: 'aluno',
          descricao: 'Perfil de aluno',
          permissao_ids: [],
        } as any);
      }
      perfilId = perfilAluno.id;
      perfilNome = 'aluno';
      usuarioAtivo = false; // INATIVO até completar cadastro
    }

    // Cria usuário com perfil selecionado
    const user = await this.usuariosService.create({
      username: payload.username,
      email: payload.email,
      nome: payload.nome,
      password: payload.password,
      cpf: payload.cpf, // Adicionar CPF ao usuário
      telefone: payload.telefone, // Adicionar telefone ao usuário
      data_nascimento: payload.data_nascimento, // Adicionar data de nascimento ao usuário
      ativo: usuarioAtivo, // Ativo apenas se perfil não requer aprovação
      perfil_ids: [perfilId],
      cadastro_completo: true, // ✅ ALUNO já vai com cadastro completo, não precisa logar 2x
    } as any);

    // VINCULAR USUÁRIO À UNIDADE conforme perfil

    if (payload.unidade_id) {
      // Gerente: vincular via tabela gerente_unidades
      if (perfilNome === 'gerente_unidade') {
        try {
          // Desvincular gerente de qualquer unidade anterior
          await this.dataSource.query(
            `UPDATE teamcruz.gerente_unidades
             SET ativo = false, updated_at = NOW()
             WHERE usuario_id = $1`,
            [user.id],
          );

          // Vincular gerente à nova unidade
          await this.dataSource.query(
            `INSERT INTO teamcruz.gerente_unidades (usuario_id, unidade_id, ativo, data_vinculo)
             VALUES ($1, $2, true, NOW())
             ON CONFLICT (usuario_id) DO UPDATE
             SET unidade_id = $2, ativo = true, updated_at = NOW()`,
            [user.id, payload.unidade_id],
          );
        } catch (error) {
          console.error(' Erro ao vincular gerente à unidade:', error.message);
        }
      }

      // Aluno: criar registro na tabela alunos
      if (perfilNome === 'aluno') {
        try {
          // Usar dados do usuário + dados adicionais do payload
          const alunoData = {
            // Dados obrigatórios
            usuario_id: user.id,
            unidade_id: payload.unidade_id,
            nome_completo: user.nome,
            cpf: user.cpf,
            data_nascimento: user.data_nascimento || payload.data_nascimento,
            genero: payload.genero || 'OUTRO', // Default se não informado

            // Contato
            email: user.email,
            telefone: user.telefone, // ✅ FIX: Usar "telefone" em vez de "telefone_whatsapp"
            telefone_emergencia: payload.telefone_emergencia || null,
            nome_contato_emergencia: payload.nome_contato_emergencia || null,

            // Matrícula
            data_matricula: new Date().toISOString().split('T')[0],
            status: 'ATIVO', // Aluno ativo por padrão no auto-cadastro

            // Graduação
            faixa_atual: payload.faixa_atual || 'BRANCA',
            graus:
              payload.graus !== undefined && payload.graus !== null
                ? payload.graus
                : 0,
            data_ultima_graduacao: payload.data_ultima_graduacao || null,

            // Dados opcionais
            peso: payload.peso || null,
            altura: payload.altura || null,
            tipo_sanguineo: payload.tipo_sanguineo || null,
            alergias: payload.alergias || null,
            medicamentos_uso_continuo: payload.medicamentos || null,
            observacoes_medicas: payload.condicoes_medicas || null,
            plano_saude: payload.plano_saude || null,

            // Responsável (para menores)
            responsavel_nome: payload.responsavel_nome || null,
            responsavel_cpf: payload.responsavel_cpf || null,
            responsavel_telefone: payload.responsavel_telefone || null,
            responsavel_parentesco: payload.responsavel_parentesco || null,

            // LGPD
            consent_lgpd: payload.consent_lgpd || false,
            consent_imagem: payload.consent_imagem || false,
            consent_lgpd_date: payload.consent_lgpd ? new Date() : null,
          };

          const alunoCriado = await this.alunosService.create(alunoData as any);
        } catch (error) {
          console.error(
            ' [CREATE ALUNO] Erro ao criar registro de aluno:',
            error.message,
          );
          console.error(' [CREATE ALUNO] Stack completo:', error.stack);
          console.error(
            ' [CREATE ALUNO] Detalhes do erro:',
            JSON.stringify(error, null, 2),
          );
          throw new Error(`Falha ao criar registro de aluno: ${error.message}`);
        }
      }
    } else if (perfilNome !== 'franqueado' && perfilNome !== 'master') {
      console.warn(
        '⚠️ [CREATE USER] unidade_id não informado para perfil',
        perfilNome,
      );
    }

    // Responsavel: criar registro na tabela responsaveis
    if (perfilNome === 'responsavel' && payload.unidade_id) {
      try {
        await this.responsaveisService.create({
          usuario_id: user.id,
          unidade_id: payload.unidade_id, // Vincular à unidade selecionada
          nome_completo: user.nome,
          cpf: user.cpf,
          email: user.email,
          telefone: user.telefone,
          data_nascimento: payload.data_nascimento,
          genero: payload.genero || 'MASCULINO',
          ativo: false, // Aguarda aprovação da unidade
        } as any);
      } catch (error) {
        console.error(' Erro ao criar registro de responsável:', error.message);
      }
    }

    // Professor: criar registro na tabela professores e professor_unidades
    if (perfilNome === 'professor' || perfilNome === 'instrutor') {
      try {
        const professor = await this.professoresService.create({
          usuario_id: user.id,
          especialidade: payload.especialidade || null,
          anos_experiencia: payload.anos_experiencia || null,
          certificacoes: payload.certificacoes || null,
        } as any);

        // Vincular professor à unidade
        if (payload.unidade_id) {
          await this.dataSource.query(
            `INSERT INTO teamcruz.professor_unidades (professor_id, unidade_id, created_at, updated_at)
             VALUES ($1, $2, NOW(), NOW())`,
            [professor.id, payload.unidade_id],
          );
        }
      } catch (error) {
        console.error(' Erro ao criar registro de professor:', error.message);
      }
    }

    // Recepcionista: criar registro na tabela recepcionista_unidades
    if (perfilNome === 'recepcionista') {
      if (payload.unidade_id) {
        try {
          await this.dataSource.query(
            `INSERT INTO teamcruz.recepcionista_unidades (usuario_id, unidade_id, ativo, created_at, updated_at)
             VALUES ($1, $2, true, NOW(), NOW())`,
            [user.id, payload.unidade_id],
          );
        } catch (error) {
          console.error(
            ' Erro ao criar registro de recepcionista:',
            error.message,
          );
        }
      }
    }

    return user;
  }

  async findOrCreateOAuthUser(oauth: {
    provider: string;
    providerId: string;
    email?: string;
    name?: string;
    avatar?: string;
  }): Promise<Usuario> {
    // encontra por email; se não houver, cria usuário mínimo ativo
    let user = oauth.email
      ? await this.usuariosService.findByEmail(oauth.email)
      : null;
    if (!user) {
      user = await this.usuariosService.create({
        username: oauth.email || `google_${oauth.providerId}`,
        email: oauth.email,
        nome: oauth.name || 'Usuário Google',
        password: '',
        ativo: true,
      } as any);
    }
    return user;
  }

  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const user = await this.usuariosService.findOne(userId);

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Validar senha atual
    const isCurrentPasswordValid = await this.usuariosService.validatePassword(
      changePasswordDto.currentPassword,
      user.password,
    );

    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Senha atual incorreta');
    }

    // Alterar senha
    await this.usuariosService.updatePassword(
      userId,
      changePasswordDto.newPassword,
    );

    return { message: 'Senha alterada com sucesso' };
  }

  async forgotPassword(
    email: string,
  ): Promise<{ message: string; found?: boolean; token?: string }> {
    const user = await this.usuariosService.findByEmail(email);

    if (!user) {
      // Em desenvolvimento, revelar que o email não existe para melhor UX
      if (process.env.NODE_ENV === 'development') {
        return {
          message:
            'Email não encontrado. Verifique se está cadastrado no sistema.',
          found: false,
        };
      }

      // Em produção, não revelar por questões de segurança
      return {
        message:
          'Se o email estiver cadastrado, você receberá as instruções de reset',
        found: false,
      };
    }

    // Gerar token de reset
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hora para expirar

    // Salvar token no banco
    const passwordReset = this.passwordResetRepository.create({
      token,
      usuarioId: user.id,
      expires_at: expiresAt,
    });

    await this.passwordResetRepository.save(passwordReset);

    // Enviar email de recuperação de senha
    try {
      await this.emailService.sendPasswordResetEmail(email, token);
    } catch (error) {
      console.error(`Erro ao enviar email de recuperação: ${error.message}`);
      // Continua mesmo se falhar o envio do email (por segurança não revelar erro)
    }

    return {
      message: 'Email de recuperação enviado com sucesso!',
      found: true,
      // Em desenvolvimento, retorna o token para facilitar testes
      ...(process.env.NODE_ENV === 'development' && { token }),
    };
  }

  async resetPassword(
    resetPasswordDto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    const passwordReset = await this.passwordResetRepository.findOne({
      where: {
        token: resetPasswordDto.token,
        used: false,
      },
      relations: ['usuario'],
    });

    if (!passwordReset) {
      throw new BadRequestException('Token de reset inválido');
    }

    if (new Date() > passwordReset.expires_at) {
      throw new BadRequestException('Token de reset expirado');
    }

    // Alterar senha
    await this.usuariosService.updatePassword(
      passwordReset.usuarioId,
      resetPasswordDto.newPassword,
    );

    // Marcar token como usado
    passwordReset.used = true;
    await this.passwordResetRepository.save(passwordReset);

    return { message: 'Senha resetada com sucesso' };
  }
}
