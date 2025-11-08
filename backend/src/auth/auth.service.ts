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
import { PapelResponsavel } from '../people/entities/unidade.entity';
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
    private dataSource: DataSource,
    private auditService: AuditService,
    private emailService: EmailService,
  ) {}

  private ACCESS_TTL_SEC = 60 * 60 * 8; // 8 horas (mais tempo para evitar expiração rápida)
  private REFRESH_TTL_MS = 1000 * 60 * 60 * 24 * 60; // 60 dias

  async validateUser(
    email: string,
    pass: string,
  ): Promise<
    { user: Usuario; error?: string } | { user: null; error: string }
  > {
    try {
      // Usa findByEmail diretamente
      const user = await this.usuariosService.findByEmail(email);

      if (!user) {
        return {
          user: null,
          error:
            'Email não encontrado. Verifique se você digitou o email correto ou cadastre-se primeiro.',
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
      console.error('❌ Erro ao validar usuário:', error);
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

    const cadastroCompleto = user.cadastro_completo || false;

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

    console.log('🔍 [validateToken] User encontrado:', {
      id: user?.id,
      username: user?.username,
      email: user?.email,
      cpf: user?.cpf,
      cadastro_completo: user?.cadastro_completo,
    });

    if (!user) {
      console.error('❌ [validateToken] Usuário não encontrado');
      return null;
    }

    // Se allowInactive = false (padrão), rejeita usuários inativos
    if (!allowInactive && !user.ativo) {
      console.error(
        '❌ [validateToken] Usuário inativo e allowInactive = false',
      );
      return null;
    }

    // Incluir dados do aluno se existir
    let aluno: any = null;
    try {
      aluno = await this.alunosService.findByUsuarioId(user.id);
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
    };

    console.log('🔍 [validateToken] userData antes de remover password:', {
      id: userData.id,
      username: userData.username,
      cpf: userData.cpf,
      perfis: userData.perfis,
    });

    // Remover password do retorno para segurança
    const { password, ...userDataWithoutPassword } = userData;

    console.log('🔍 [validateToken] userDataWithoutPassword:', {
      id: userDataWithoutPassword.id,
      username: userDataWithoutPassword.username,
      cpf: userDataWithoutPassword.cpf,
      perfis: userDataWithoutPassword.perfis,
    });

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
      if (user.cpf) {
        const query = `
          SELECT id, nome, cnpj, status, responsavel_nome
          FROM teamcruz.unidades
          WHERE responsavel_cpf = $1
          LIMIT 1
        `;
        const result = await this.usuariosService['dataSource'].query(query, [
          user.cpf,
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
      console.error('❌ [completeProfile] Usuário não encontrado');
      throw new NotFoundException('Usuário não encontrado');
    }

    if (user.cadastro_completo) {
      console.error('❌ [completeProfile] Cadastro já foi completado');
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
          console.error(
            '❌ [completeProfile] ERRO ao criar aluno:',
            alunoError,
          );
          console.error('❌ [completeProfile] Stack trace:', alunoError.stack);
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
        console.log(
          '🔍 [completeProfile GERENTE] Iniciando vinculação de gerente',
        );
        console.log('🔍 [completeProfile GERENTE] User:', {
          id: userId,
          nome: user.nome,
          cpf: user.cpf,
        });
        console.log(
          '🔍 [completeProfile GERENTE] profileData.unidade_id:',
          profileData.unidade_id,
        );

        // Se o gerente foi criado com unidade_id pelo franqueado, usar essa unidade
        // Não permitir que o gerente escolha outra unidade no complete-profile

        // Buscar qual unidade este gerente gerencia (através do responsavel_cpf)
        const unidadeDoGerente = await this.dataSource.query(
          `SELECT id, nome FROM teamcruz.unidades WHERE responsavel_cpf = $1 LIMIT 1`,
          [user.cpf],
        );

        console.log(
          '🔍 [completeProfile GERENTE] Unidades encontradas com CPF:',
          unidadeDoGerente,
        );

        if (unidadeDoGerente && unidadeDoGerente[0]) {
          console.log(
            `✅ [completeProfile GERENTE] Gerente ${user.nome} JÁ vinculado à unidade ${unidadeDoGerente[0].nome} (${unidadeDoGerente[0].id})`,
          );
          // Gerente já está vinculado via responsavel_cpf, não precisa fazer nada
        } else if (profileData.unidade_id) {
          console.log(
            `🔄 [completeProfile GERENTE] Vinculando gerente à unidade ${profileData.unidade_id}`,
          );
          // Se não encontrou via CPF mas veio unidade_id do formulário, vincular
          await this.unidadesService.atualizar(profileData.unidade_id, {
            responsavel_cpf: user.cpf,
          });
          console.log(
            `✅ [completeProfile GERENTE] Gerente ${user.nome} VINCULADO à unidade ${profileData.unidade_id}`,
          );
        } else {
          console.warn(
            `⚠️ [completeProfile GERENTE] Gerente ${user.nome} SEM UNIDADE DEFINIDA!`,
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
      username: payload.email,
      email: payload.email,
      nome: payload.nome,
      password: payload.password,
      cpf: payload.cpf, // Adicionar CPF ao usuário
      telefone: payload.telefone, // Adicionar telefone ao usuário
      data_nascimento: payload.data_nascimento, // Adicionar data de nascimento ao usuário
      ativo: usuarioAtivo, // Ativo apenas se perfil não requer aprovação
      perfil_ids: [perfilId],
      cadastro_completo: perfilNome === 'aluno' ? false : true, // Apenas aluno precisa completar cadastro, franqueado vai direto para minha-franquia
    } as any);

    // VINCULAR USUÁRIO À UNIDADE conforme perfil
    console.log('🔗 [CREATE USER] Verificando vínculo com unidade', {
      perfil: perfilNome,
      unidade_id: payload.unidade_id,
      user_cpf: user.cpf,
    });

    if (payload.unidade_id) {
      // Gerente: vincular como responsavel_cpf na unidade
      if (perfilNome === 'gerente_unidade') {
        console.log('🔗 [GERENTE] Vinculando gerente à unidade...', {
          unidade_id: payload.unidade_id,
          cpf: user.cpf,
        });
        try {
          // ✅ PASSO 1: Remover CPF de TODAS as outras unidades (para evitar conflito)
          const query = `
            UPDATE teamcruz.unidades
            SET responsavel_cpf = NULL, responsavel_papel = NULL, updated_at = NOW()
            WHERE responsavel_cpf = $1 AND responsavel_papel = 'GERENTE'
          `;
          await this.dataSource.query(query, [user.cpf]);
          console.log('🧹 [GERENTE] CPF removido de unidades anteriores');

          // ✅ PASSO 2: Definir CPF na nova unidade
          await this.unidadesService.atualizar(payload.unidade_id, {
            responsavel_cpf: user.cpf,
            responsavel_papel: PapelResponsavel.GERENTE,
          });
          console.log('✅ [GERENTE] Vinculado à nova unidade com sucesso!');
        } catch (error) {
          console.error(
            '❌ Erro ao vincular gerente à unidade:',
            error.message,
          );
        }
      }

      // Aluno: criar registro na tabela alunos
      if (perfilNome === 'aluno') {
        try {
          await this.alunosService.create({
            usuario_id: user.id,
            unidade_id: payload.unidade_id,
            faixa_id: payload.faixa_id || null,
            data_nascimento: payload.data_nascimento || null,
            peso: payload.peso || null,
            altura: payload.altura || null,
            tipo_sanguineo: payload.tipo_sanguineo || null,
            alergias: payload.alergias || null,
            medicamentos: payload.medicamentos || null,
            condicoes_medicas: payload.condicoes_medicas || null,
            contato_emergencia_nome: payload.contato_emergencia_nome || null,
            contato_emergencia_telefone:
              payload.contato_emergencia_telefone || null,
            contato_emergencia_parentesco:
              payload.contato_emergencia_parentesco || null,
          } as any);
        } catch (error) {
          console.error('❌ Erro ao criar registro de aluno:', error.message);
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
          nome_completo: user.nome,
          cpf: user.cpf,
          email: user.email,
          telefone: user.telefone,
          data_nascimento: payload.data_nascimento,
          genero: payload.genero || 'MASCULINO',
          ativo: false, // Aguarda aprovação da unidade
        } as any);
      } catch (error) {
        console.error(
          '❌ Erro ao criar registro de responsável:',
          error.message,
        );
      }
    }

    // Professor: criar registro na tabela professores e professor_unidades
    if (perfilNome === 'professor' || perfilNome === 'instrutor') {
      try {
        console.log('🔗 [PROFESSOR] Criando registro de professor...', {
          usuario_id: user.id,
          unidade_id: payload.unidade_id,
        });

        const professor = await this.professoresService.create({
          usuario_id: user.id,
          especialidade: payload.especialidade || null,
          anos_experiencia: payload.anos_experiencia || null,
          certificacoes: payload.certificacoes || null,
        } as any);

        // Vincular professor à unidade
        if (payload.unidade_id) {
          console.log('🔗 [PROFESSOR] Vinculando professor à unidade...', {
            professor_id: professor.id,
            unidade_id: payload.unidade_id,
          });
          await this.dataSource.query(
            `INSERT INTO teamcruz.professor_unidades (professor_id, unidade_id, created_at, updated_at)
             VALUES ($1, $2, NOW(), NOW())`,
            [professor.id, payload.unidade_id],
          );
          console.log('✅ [PROFESSOR] Vinculado com sucesso!');
        } else {
          console.log('⚠️ [PROFESSOR] Nenhuma unidade fornecida para vincular');
        }
      } catch (error) {
        console.error('❌ Erro ao criar registro de professor:', error.message);
      }
    }

    // Recepcionista: criar registro na tabela recepcionista_unidades
    if (perfilNome === 'recepcionista') {
      if (payload.unidade_id) {
        try {
          console.log(
            '🔗 [RECEPCIONISTA] Vinculando recepcionista à unidade...',
            {
              usuario_id: user.id,
              unidade_id: payload.unidade_id,
            },
          );
          await this.dataSource.query(
            `INSERT INTO teamcruz.recepcionista_unidades (usuario_id, unidade_id, ativo, created_at, updated_at)
             VALUES ($1, $2, true, NOW(), NOW())`,
            [user.id, payload.unidade_id],
          );
          console.log(
            '✅ [RECEPCIONISTA] Vinculado com sucesso à tabela recepcionista_unidades!',
          );
        } catch (error) {
          console.error(
            '❌ Erro ao criar registro de recepcionista:',
            error.message,
          );
        }
      } else {
        console.log(
          '⚠️ [RECEPCIONISTA] Nenhuma unidade fornecida para vincular',
        );
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
