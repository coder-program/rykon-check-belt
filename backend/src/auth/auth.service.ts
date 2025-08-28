import { Injectable, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { UsuariosService } from '../usuarios/services/usuarios.service';
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
  ) {}

  async validateUser(username: string, pass: string): Promise<Usuario | null> {
    const user = await this.usuariosService.findByUsername(username);
    
    if (user && user.ativo && await this.usuariosService.validatePassword(pass, user.password)) {
      // Atualizar último login
      await this.usuariosService.updateUltimoLogin(user.id);
      return user;
    }
    return null;
  }

  async login(user: Usuario): Promise<LoginResponse> {
    const permissions = await this.usuariosService.getUserPermissions(user.id);
    const permissionsDetail = await this.usuariosService.getUserPermissionsDetail(user.id);
    const perfis = await this.usuariosService.getUserPerfis(user.id);
    
    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      email: user.email,
      permissions,
    };

    return {
      access_token: this.jwtService.sign(payload),
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

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto): Promise<{ message: string }> {
    const user = await this.usuariosService.findOne(userId);
    
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Validar senha atual
    const isCurrentPasswordValid = await this.usuariosService.validatePassword(
      changePasswordDto.currentPassword,
      user.password
    );

    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Senha atual incorreta');
    }

    // Alterar senha
    await this.usuariosService.updatePassword(userId, changePasswordDto.newPassword);

    return { message: 'Senha alterada com sucesso' };
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.usuariosService.findByEmail(email);
    
    if (!user) {
      // Não revelar que o usuário não existe por questões de segurança
      return { message: 'Se o email estiver cadastrado, você receberá as instruções de reset' };
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

    return { message: 'Se o email estiver cadastrado, você receberá as instruções de reset' };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<{ message: string }> {
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
      resetPasswordDto.newPassword
    );

    // Marcar token como usado
    passwordReset.used = true;
    await this.passwordResetRepository.save(passwordReset);

    return { message: 'Senha resetada com sucesso' };
  }
}
