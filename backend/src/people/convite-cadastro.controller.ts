import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Delete,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ConviteCadastroService } from './convite-cadastro.service';
import {
  CriarConviteDto,
  CompletarCadastroDto,
} from './dto/convite-cadastro.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Convites de Cadastro')
@Controller('convites-cadastro')
export class ConviteCadastroController {
  constructor(private readonly conviteService: ConviteCadastroService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Criar convite de cadastro' })
  @ApiResponse({ status: 201, description: 'Convite criado com sucesso' })
  async criarConvite(@Body() dto: CriarConviteDto, @Request() req: any) {
    return await this.conviteService.criarConvite(dto, req.user.id);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar convites' })
  @ApiResponse({ status: 200, description: 'Lista de convites' })
  async listarConvites(@Query('unidadeId') unidadeId?: string) {
    return await this.conviteService.listarConvites(unidadeId);
  }

  @Get('validar/:token')
  @Public()
  @ApiOperation({ summary: 'Validar token de convite (público)' })
  @ApiResponse({ status: 200, description: 'Token válido' })
  async validarToken(@Param('token') token: string) {
    return await this.conviteService.validarToken(token);
  }

  @Post('completar')
  @Public()
  @ApiOperation({ summary: 'Completar cadastro via convite (público)' })
  @ApiResponse({ status: 201, description: 'Cadastro completado' })
  async completarCadastro(@Body() dto: CompletarCadastroDto) {
    return await this.conviteService.completarCadastro(dto);
  }

  @Post(':id/reenviar')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reenviar convite (estende expiração)' })
  @ApiResponse({ status: 200, description: 'Convite reenviado' })
  async reenviarConvite(@Param('id') id: string) {
    return await this.conviteService.reenviarConvite(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancelar convite' })
  @ApiResponse({ status: 200, description: 'Convite cancelado' })
  async cancelarConvite(@Param('id') id: string) {
    return await this.conviteService.cancelarConvite(id);
  }
}
