import {
  Controller,
  Request,
  Post,
  UseGuards,
  Body,
  Get,
  Res,
  Req,
} from '@nestjs/common';
import { Response, Request as ExpressRequest } from 'express';
import { AuthService, LoginResponse } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtAuthGuardAllowInactive } from './guards/jwt-auth-allow-inactive.guard';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RegisterDto } from './dto/register.dto';
import { CompleteProfileDto } from './dto/complete-profile.dto';
import { AllowIncomplete } from './decorators/allow-incomplete.decorator';
import {
  ApiOperation,
  ApiTags,
  ApiBearerAuth,
  ApiResponse,
  ApiBody,
  ApiHeader,
} from '@nestjs/swagger';

@ApiTags('🔐 Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @ApiOperation({
    summary: '🔑 Login no sistema',
    description:
      'Autentica usuário com email/senha e retorna access_token JWT + refresh_token via cookie',
  })
  @ApiBody({
    type: LoginDto,
    description: 'Credenciais de login',
    examples: {
      admin: {
        summary: 'Admin Master',
        value: { email: 'admin@teamcruz.com', password: '123456' },
      },
      franqueado: {
        summary: 'Franqueado Teste',
        value: { email: 'franqueado@test.com', password: '123456' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: '✅ Login realizado com sucesso',
    schema: {
      type: 'object',
      properties: {
        access_token: {
          type: 'string',
          description: 'Token JWT para autorização',
        },
        user: {
          type: 'object',
          description: 'Dados do usuário autenticado',
          properties: {
            id: { type: 'number' },
            email: { type: 'string' },
            nome: { type: 'string' },
            perfil: { type: 'string' },
            situacao: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: ' Credenciais inválidas' })
  async login(
    @Request() req,
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponse> {
    if (!req.user) {
      console.error(
        ' AuthController.login - Nenhum usuário no request (LocalAuthGuard falhou)',
      );
      throw new Error('Authentication failed');
    }

    // Capturar IP e UserAgent para auditoria
    const ipAddress = req.ip || req.connection?.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';

    const resp = await this.authService.login(req.user, ipAddress, userAgent);
    const rt = this.authService.issueRefreshToken(req.user.id);
    this.setRefreshCookie(res, rt);
    return resp;
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '👤 Perfil do usuário autenticado',
    description: 'Retorna dados completos do perfil do usuário logado',
  })
  @ApiResponse({ status: 200, description: '✅ Perfil retornado com sucesso' })
  @ApiResponse({ status: 401, description: ' Token inválido ou expirado' })
  async getProfile(@Request() req) {
    // Retornar getUserProfile para incluir perfis formatados corretamente
    return this.authService.getUserProfile(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '🆔 Dados completos do usuário autenticado',
    description:
      'Retorna informações detalhadas incluindo status do cadastro e permissões',
  })
  @ApiResponse({ status: 200, description: '✅ Dados do usuário retornados' })
  @ApiResponse({ status: 401, description: ' Token inválido ou expirado' })
  async getMe(@Request() req) {
    return this.authService.getUserProfile(req.user.id);
  }

  @UseGuards(JwtAuthGuardAllowInactive)
  @AllowIncomplete()
  @Post('complete-profile')
  @ApiOperation({ summary: 'Completar dados do perfil após primeiro login' })
  async completeProfile(
    @Request() req,
    @Body() completeProfileDto: CompleteProfileDto,
  ) {
    try {
      const result = await this.authService.completeProfile(
        req.user.id,
        completeProfileDto,
      );
      return result;
    } catch (error) {
      console.error(' [AuthController.completeProfile] ERRO:', error.message);
      console.error(' [AuthController.completeProfile] Stack:', error.stack);
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('refresh')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '🔄 Renovar access token',
    description: 'Gera um novo access token usando o JWT atual ainda válido',
  })
  @ApiResponse({ status: 200, description: '✅ Token renovado com sucesso' })
  @ApiResponse({ status: 401, description: ' Token inválido para renovação' })
  async refreshToken(@Request() req): Promise<LoginResponse> {
    return this.authService.refreshToken(req.user);
  }

  // Refresh via cookie httpOnly: lê cookie, rotaciona e entrega novo access token
  @Post('refresh-cookie')
  @ApiOperation({ summary: 'Renovar tokens via cookie httpOnly' })
  async refreshViaCookie(
    @Req() req: ExpressRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponse> {
    const rt = req.cookies?.['rt'];
    if (!rt) throw new Error('No refresh token');
    const rotated = this.authService.rotateRefresh(rt);
    if (!rotated) throw new Error('Invalid refresh token');
    this.setRefreshCookie(res, rotated.token);
    const user = await this.authService.validateToken({
      sub: rotated.userId,
      username: '',
      email: '',
      permissions: [],
    } as any);
    return this.authService.refreshToken(user as any);
  }

  @Post('register')
  @ApiOperation({ summary: 'Auto-cadastro de aluno' })
  async register(
    @Request() req,
    @Body() body: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponse> {
    const user = await this.authService.registerAluno(body);

    // Capturar IP e UserAgent para auditoria
    const ipAddress = req.ip || req.connection?.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';

    const resp = await this.authService.login(user, ipAddress, userAgent);
    const rt = this.authService.issueRefreshToken(user.id);
    this.setRefreshCookie(res, rt);
    return resp;
  }

  private setRefreshCookie(res: Response, token: string) {
    res.cookie('rt', token, {
      httpOnly: true,
      secure: false, // ajuste para true em produção (HTTPS)
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 60, // 60 dias
      path: '/',
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @ApiOperation({ summary: 'Alterar senha' })
  async changePassword(
    @Request() req,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(req.user.id, changePasswordDto);
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Solicitar recuperação de senha' })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto.email);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Resetar senha com token' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Get('health')
  @ApiOperation({ summary: 'Healthcheck da API' })
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
