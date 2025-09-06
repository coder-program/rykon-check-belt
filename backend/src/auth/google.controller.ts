import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';

@Controller('auth')
export class GoogleAuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: any, @Res() res: any) {
    const user = await this.authService.findOrCreateOAuthUser(req.user);
    const jwt = await this.authService.login(user);
    const redirect = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/callback?token=${jwt.access_token}`;
    return res.redirect(redirect);
  }
}
