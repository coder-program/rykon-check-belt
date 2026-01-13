import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  Request,
  Inject,
  Delete,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { VendasService } from '../services/vendas.service';
import {
  CreateVendaDto,
  UpdateVendaDto,
  FiltroVendasDto,
  ReenviarLinkDto,
} from '../dto/venda.dto';

@Controller('vendas')
@UseGuards(JwtAuthGuard)
export class VendasController {
  constructor(
    private readonly vendasService: VendasService,
    @Inject(DataSource) private dataSource: DataSource,
  ) {}

  private async getUnidadeIdFromUser(user: any): Promise<string | null> {
    if (!user) return null;
    if (user.unidade_id) return user.unidade_id;
    const perfis =
      user?.perfis?.map((p: any) =>
        (typeof p === 'string' ? p : p.nome)?.toUpperCase(),
      ) || [];
    if (perfis.includes('GERENTE_UNIDADE')) {
      const result = await this.dataSource.query(
        `SELECT unidade_id FROM teamcruz.gerente_unidades WHERE usuario_id = $1 AND ativo = true LIMIT 1`,
        [user.id],
      );
      if (result && result.length > 0) return result[0].unidade_id;
    }
    if (perfis.includes('RECEPCIONISTA')) {
      const result = await this.dataSource.query(
        `SELECT unidade_id FROM teamcruz.recepcionista_unidades WHERE usuario_id = $1 AND ativo = true LIMIT 1`,
        [user.id],
      );
      if (result && result.length > 0) return result[0].unidade_id;
    }
    return null;
  }

  @Post()
  create(@Body() createVendaDto: CreateVendaDto, @Request() req) {
    return this.vendasService.create(createVendaDto, req.user);
  }

  @Get()
  async findAll(@Query() filtro: FiltroVendasDto, @Request() req) {
    const user = req.user;
    const isFranqueado =
      user.tipo_usuario === 'FRANQUEADO' ||
      user.perfis?.some(
        (p: any) =>
          (typeof p === 'string' ? p : p.nome)?.toUpperCase() === 'FRANQUEADO',
      );
    const userUnidadeId = await this.getUnidadeIdFromUser(user);

    // Buscar franqueado_id se for franqueado
    let franqueadoId: string | null = null;
    if (isFranqueado && user?.id) {
      const franqueadoResult = await this.dataSource.query(
        `SELECT id FROM teamcruz.franqueados WHERE usuario_id = $1 LIMIT 1`,
        [user.id],
      );
      franqueadoId = franqueadoResult[0]?.id || null;
    }

    if (!filtro.unidadeId) {
      if (isFranqueado) {
        // Será filtrado no service pelo franqueado_id
      } else if (userUnidadeId) {
        filtro.unidadeId = userUnidadeId;
      }
    } else {
      if (!isFranqueado && user.tipo_usuario !== 'MASTER') {
        if (userUnidadeId && filtro.unidadeId !== userUnidadeId) {
          return [];
        }
      }
    }

    const vendas = await this.vendasService.findAll(filtro, franqueadoId);
    return vendas.map((venda) => ({
      ...venda,
      aluno_nome: venda.aluno?.nome_completo,
      aluno_email: venda.aluno?.email,
      aluno_telefone: venda.aluno?.telefone,
    }));
  }

  @Get('estatisticas')
  async estatisticas(
    @Query('unidadeId') unidadeId?: string,
    @Request() req?: any,
  ) {
    const user = req?.user;

    // Verificar se é franqueado
    const isFranqueado =
      user?.tipo_usuario === 'FRANQUEADO' ||
      user?.perfis?.some(
        (p: any) =>
          (typeof p === 'string' ? p : p.nome)?.toUpperCase() === 'FRANQUEADO',
      );

    const userUnidadeId = await this.getUnidadeIdFromUser(user);

    // Buscar franqueado_id se for franqueado
    let franqueadoId: string | null = null;
    if (isFranqueado && user?.id) {
      const franqueadoResult = await this.dataSource.query(
        `SELECT id FROM teamcruz.franqueados WHERE usuario_id = $1 LIMIT 1`,
        [user.id],
      );
      franqueadoId = franqueadoResult[0]?.id || null;
    }

    if (!unidadeId) {
      if (isFranqueado) {
        // Será filtrado no service pelo franqueado_id
      } else if (userUnidadeId) {
        unidadeId = userUnidadeId;
      }
    } else {
      if (!isFranqueado && user?.tipo_usuario !== 'MASTER') {
        if (userUnidadeId && unidadeId !== userUnidadeId) {
          return {
            totalVendas: 0,
            vendasPagas: 0,
            vendasPendentes: 0,
            vendasFalhas: 0,
            valorTotal: 0,
            valorPago: 0,
          };
        }
      }
    }

    return this.vendasService.estatisticas(unidadeId, franqueadoId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const venda = await this.vendasService.findOne(id);
    return {
      ...venda,
      aluno_nome: venda.aluno?.nome_completo,
      aluno_email: venda.aluno?.email,
      aluno_telefone: venda.aluno?.telefone,
    };
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateVendaDto: UpdateVendaDto) {
    return this.vendasService.update(id, updateVendaDto);
  }

  @Patch(':id/baixar')
  baixar(
    @Param('id') id: string,
    @Body() dados: { metodo_pagamento?: string; observacoes?: string },
    @Request() req,
  ) {
    return this.vendasService.baixar(id, dados, req.user);
  }

  @Post(':id/cancelar')
  cancelar(@Param('id') id: string) {
    return this.vendasService.cancelar(id);
  }

  @Post('reenviar-link')
  reenviarLink(@Body() dto: ReenviarLinkDto) {
    return this.vendasService.reenviarLink(
      dto.vendaId,
      dto.email,
      dto.telefone,
    );
  }

  @Post('webhook')
  processarWebhook(@Body() dados: any) {
    return this.vendasService.processarWebhook(dados);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.vendasService.remove(id);
  }
}
