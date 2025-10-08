import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { UsuariosService } from '../usuarios/services/usuarios.service';
import { PerfisService } from '../usuarios/services/perfis.service';
import { AlunosService } from '../people/services/alunos.service';
import { ProfessoresService } from '../people/services/professores.service';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { PasswordReset } from './entities/password-reset.entity';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
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
  ) {}

  private ACCESS_TTL_SEC = 60 * 30; // 30 min
  private REFRESH_TTL_MS = 1000 * 60 * 60 * 24 * 60; // 60 dias

  async validateUser(
    email: string,
    pass: string,
  ): Promise<
    { user: Usuario; error?: string } | { user: null; error: string }
  > {
    console.log(
      '🔍 AuthService.validateUser - Tentando validar com email:',
      email,
    );
    console.log('🔍 Senha fornecida:', pass);
    console.log('🔍 Tamanho da senha fornecida:', pass?.length);

    try {
      // Usa findByEmail diretamente
      const user = await this.usuariosService.findByEmail(email);
      console.log('🔍 Usuário encontrado?', !!user);

      if (!user) {
        console.log('❌ Usuário não encontrado no banco');
        return {
          user: null,
          error:
            'Email não encontrado. Verifique se você digitou o email correto ou cadastre-se primeiro.',
        };
      }

      console.log('🔍 Usuário ativo?', user.ativo);
      console.log('🔍 Usuário tem senha?', !!user.password);
      console.log(
        '🔍 Primeiros 20 chars do hash:',
        user.password?.substring(0, 20),
      );

      if (!user.ativo) {
        console.log('❌ Usuário inativo');
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
      console.log('🔍 Senha válida?', passwordValid);

      if (!passwordValid) {
        console.log('❌ Senha inválida');
        return {
          user: null,
          error: 'Senha incorreta. Verifique sua senha e tente novamente.',
        };
      }

      console.log('✅ Usuário validado com sucesso!');
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

  async login(user: Usuario): Promise<LoginResponse> {
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
    console.log('🔍 [login] Debug cadastro_completo:');
    console.log(
      '🔍 [login] user.cadastro_completo raw:',
      user.cadastro_completo,
    );
    console.log(
      '🔍 [login] user.cadastro_completo typeof:',
      typeof user.cadastro_completo,
    );
    console.log('🔍 [login] cadastroCompleto final:', cadastroCompleto);

    return {
      access_token: this.jwtService.sign(payload, {
        expiresIn: this.ACCESS_TTL_SEC,
      }),
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        nome: user.nome,
        cadastro_completo: cadastroCompleto,
        permissions,
        permissionsDetail,
        perfis,
      },
    };
  }

  async validateToken(payload: JwtPayload): Promise<any | null> {
    const user = await this.usuariosService.findOne(payload.sub);

    if (!user || !user.ativo) {
      return null;
    }

    // Incluir dados do aluno se existir
    let aluno: any = null;
    try {
      aluno = await this.alunosService.findByUsuarioId(user.id);
      if (aluno) {
        console.log(
          '✅ [validateToken] Aluno encontrado:',
          aluno.nome_completo,
          'Unidade:',
          aluno.unidade_id,
        );
      }
    } catch (error) {
      console.log('⚠️ [validateToken] Usuário não é aluno ou erro ao buscar');
    }

    return {
      ...user,
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

    console.log('🔍 [getUserProfile] Debug perfis:');
    console.log('🔍 [getUserProfile] perfis raw:', perfis);
    console.log('🔍 [getUserProfile] perfis typeof:', typeof perfis);
    console.log('🔍 [getUserProfile] perfis isArray:', Array.isArray(perfis));
    if (perfis && perfis.length > 0) {
      console.log('🔍 [getUserProfile] perfis[0]:', perfis[0]);
      console.log('🔍 [getUserProfile] perfis[0] typeof:', typeof perfis[0]);
    }

    // Remover senha do retorno
    const { password, ...userWithoutPassword } = user;

    const result = {
      ...userWithoutPassword,
      permissions,
      permissionsDetail,
      perfis,
    };

    console.log('🔍 [getUserProfile] Result perfis:', result.perfis);

    return result;
  }

  async completeProfile(userId: string, profileData: any) {
    console.log('🔄 [completeProfile] Iniciando...');
    console.log('🔄 [completeProfile] userId:', userId);
    console.log(
      '🔄 [completeProfile] profileData recebido:',
      JSON.stringify(profileData, null, 2),
    );

    const user = await this.usuariosService.findOne(userId);
    console.log(
      '🔄 [completeProfile] Usuário encontrado:',
      user ? 'SIM' : 'NÃO',
    );

    if (!user) {
      console.error('❌ [completeProfile] Usuário não encontrado');
      throw new NotFoundException('Usuário não encontrado');
    }

    console.log(
      '🔄 [completeProfile] Cadastro já completo?',
      user.cadastro_completo,
    );
    if (user.cadastro_completo) {
      console.error('❌ [completeProfile] Cadastro já foi completado');
      throw new BadRequestException('Cadastro já foi completado');
    }

    const perfis = await this.usuariosService.getUserPerfis(userId);
    console.log('🔄 [completeProfile] Perfis do usuário:', perfis);
    const perfilPrincipal = perfis[0]?.toLowerCase();
    console.log('🔄 [completeProfile] Perfil principal:', perfilPrincipal);

    try {
      // Completar cadastro baseado no perfil
      if (perfilPrincipal === 'aluno') {
        console.log(
          '👨‍🎓 [completeProfile] Iniciando criação de registro ALUNO...',
        );

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
          data_nascimento: profileData.data_nascimento,
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

        console.log(
          '👨‍🎓 [completeProfile] Dados do aluno preparados:',
          JSON.stringify(alunoData, null, 2),
        );

        try {
          const alunoCreated = await this.alunosService.create(
            alunoData as any,
          );
          console.log(
            `✅ [completeProfile] Registro de aluno criado com sucesso! ID: ${alunoCreated.id}`,
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
        await this.professoresService.create({
          tipo_cadastro: 'PROFESSOR',
          nome_completo: user.nome,
          cpf: user.cpf,
          email: user.email,
          telefone: user.telefone,
          data_nascimento: profileData.data_nascimento,
          genero: profileData.genero || 'OUTRO',
          status: 'INATIVO', // Aguarda aprovação
          unidades_vinculadas: [profileData.unidade_id],
          especialidades: profileData.especialidades || [],
          observacoes: profileData.observacoes,
        } as any);
      }

      // Marcar cadastro como completo e desativar até aprovação do admin
      await this.usuariosService.update(userId, {
        cadastro_completo: true,
        ativo: false, // Desativar usuário até admin aprovar
      } as any);

      console.log(`✅ Cadastro de ${user.nome} completado com sucesso!`);
      console.log(
        `⏳ Usuário desativado. Aguardando aprovação de um administrador...`,
      );

      return {
        message:
          'Cadastro completado com sucesso! Aguardando aprovação do administrador.',
        success: true,
        status: 'aguardando_aprovacao',
      };

      return {
        message:
          'Cadastro completado com sucesso! Aguardando aprovação de um administrador.',
        cadastro_completo: true,
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
    let usuarioAtivo = true; // Por padrão ativo

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
            console.log(
              `⚠️  Cadastro com perfil "${perfilNome}" requer aprovação. Usuário criado como INATIVO.`,
            );
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
      usuarioAtivo = true; // Aluno sempre ativo
      console.log('✅ Usando perfil "aluno" como padrão.');
    }

    // Cria usuário com perfil selecionado
    const user = await this.usuariosService.create({
      username: payload.email,
      email: payload.email,
      nome: payload.nome,
      password: payload.password,
      cpf: payload.cpf, // Adicionar CPF ao usuário
      telefone: payload.telefone, // Adicionar telefone ao usuário
      ativo: usuarioAtivo, // Ativo apenas se perfil não requer aprovação
      perfil_ids: [perfilId],
    } as any);

    // Nota: O registro de aluno será criado posteriormente quando necessário
    // através do módulo de gestão de alunos, com todos os dados necessários
    // (unidade, faixa, dados médicos, responsável, etc.)

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

  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.usuariosService.findByEmail(email);

    if (!user) {
      // Não revelar que o usuário não existe por questões de segurança
      return {
        message:
          'Se o email estiver cadastrado, você receberá as instruções de reset',
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

    // Aqui você implementaria o envio de email
    console.log(`Token de reset para ${email}: ${token}`);

    return {
      message:
        'Se o email estiver cadastrado, você receberá as instruções de reset',
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
