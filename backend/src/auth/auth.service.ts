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
  ) {}

  private ACCESS_TTL_SEC = 60 * 30; // 30 min
  private REFRESH_TTL_MS = 1000 * 60 * 60 * 24 * 60; // 60 dias

  async validateUser(email: string, pass: string): Promise<Usuario | null> {
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

      if (user) {
        console.log('🔍 Usuário ativo?', user.ativo);
        console.log('🔍 Usuário tem senha?', !!user.password);
        console.log(
          '🔍 Primeiros 20 chars do hash:',
          user.password?.substring(0, 20),
        );

        const passwordValid = await this.usuariosService.validatePassword(
          pass,
          user.password,
        );
        console.log('🔍 Senha válida?', passwordValid);

        if (user.ativo && passwordValid) {
          console.log('✅ Usuário validado com sucesso!');
          // Atualizar último login
          await this.usuariosService.updateUltimoLogin(user.id);
          return user;
        } else {
          console.log(
            '❌ Falha: ativo=',
            user.ativo,
            'passwordValid=',
            passwordValid,
          );
        }
      } else {
        console.log('❌ Usuário não encontrado no banco');
      }
    } catch (error) {
      console.error('❌ Erro ao validar usuário:', error);
    }

    return null;
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

    return {
      access_token: this.jwtService.sign(payload, {
        expiresIn: this.ACCESS_TTL_SEC,
      }),
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        nome: user.nome,
        permissions,
        permissionsDetail,
        perfis,
      },
    };
  }

  async validateToken(payload: JwtPayload): Promise<Usuario | null> {
    const user = await this.usuariosService.findOne(payload.sub);

    if (user && user.ativo) {
      return user;
    }

    return null;
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
        const perfilEscolhido =
          await this.perfisService.findOne(payload.perfil_id);
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
      ativo: usuarioAtivo, // Ativo apenas se perfil não requer aprovação
      perfil_ids: [perfilId],
    } as any);

    // Cria registro de aluno vinculado
    // Status: INATIVO se usuário precisa aprovação, ATIVO caso contrário
    await this.alunosService.create({
      tipo_cadastro: 'ALUNO',
      nome_completo: payload.nome,
      cpf: payload.cpf,
      email: payload.email,
      telefone: payload.telefone,
      data_nascimento: payload.data_nascimento,
      status: usuarioAtivo ? 'ATIVO' : 'INATIVO', // INATIVO se aguarda aprovação
      genero: 'OUTRO', // Padrão, pode ser atualizado depois
    } as any);

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
