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
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @ApiOperation({ summary: 'Login com usuário e senha' })
  async login(
    @Request() req,
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponse> {
    const resp = await this.authService.login(req.user);
    const rt = this.authService.issueRefreshToken(req.user.id);
    this.setRefreshCookie(res, rt);
    return resp;
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiOperation({ summary: 'Perfil do usuário autenticado' })
  getProfile(@Request() req) {
    return req.user;
  }

  @UseGuards(JwtAuthGuard)
  @Post('refresh')
  @ApiOperation({ summary: 'Renovar access token com JWT guard' })
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
    @Body() body: any,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponse> {
    const user = await this.authService.registerAluno(body);
    const resp = await this.authService.login(user);
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
