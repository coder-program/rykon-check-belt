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
    // garantir perfil "aluno"
    let perfilAluno = await this.perfisService.findByName('aluno');
    if (!perfilAluno) {
      perfilAluno = await this.perfisService.create({
        nome: 'aluno',
        descricao: 'Perfil de aluno',
        permissao_ids: [],
      } as any);
    }

    // cria usuário com perfil aluno
    const user = await this.usuariosService.create({
      username: payload.email,
      email: payload.email,
      nome: payload.nome,
      password: payload.password,
      ativo: true,
      perfil_ids: [perfilAluno.id],
    } as any);

    // cria registro de aluno vinculado (status pendente até professor aprovar)
    await this.alunosService.create({
      nome: payload.nome,
      email: payload.email,
      telefone: payload.telefone,
      data_nascimento: payload.data_nascimento,
      academia_unidade: payload.academia_unidade,
      peso: payload.peso,
      faixa: payload.faixa || 'Branca',
      graus: payload.graus || 0,
      professor_id: payload.professor_id || null,
      categoria_ibjjf: payload.categoria_ibjjf || null,
      status_validacao: 'pendente',
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
