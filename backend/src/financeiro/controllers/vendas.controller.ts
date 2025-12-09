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

    console.log('🔍 [VENDAS] Requisição recebida:', {
      usuario_id: user.id,
      tipo_usuario: user.tipo_usuario,
      unidade_id_usuario: userUnidadeId,
      filtro_unidade_id: filtro.unidadeId,
      isFranqueado,
    });

    if (!filtro.unidadeId) {
      if (isFranqueado) {
        console.log('⚠️ [VENDAS] Franqueado sem unidade_id - retornando vazio');
        return [];
      }
      if (userUnidadeId) {
        console.log('✅ [VENDAS] Aplicando unidade do usuário:', userUnidadeId);
        filtro.unidadeId = userUnidadeId;
      }
    } else {
      if (!isFranqueado && user.tipo_usuario !== 'MASTER') {
        if (userUnidadeId && filtro.unidadeId !== userUnidadeId) {
          console.log('🚫 [VENDAS] ACESSO NEGADO:', {
            solicitada: filtro.unidadeId,
            usuario: userUnidadeId,
          });
          return [];
        }
      }
    }

    const vendas = await this.vendasService.findAll(filtro);
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

    console.log('🔍 [VENDAS ESTATISTICAS] Requisição recebida:', {
      usuario_id: user?.id,
      tipo_usuario: user?.tipo_usuario,
      perfis: user?.perfis,
      unidade_id_usuario: userUnidadeId,
      filtro_unidade_id: unidadeId,
      isFranqueado,
    });

    if (!unidadeId) {
      if (isFranqueado) {
        console.log(
          '⚠️ [VENDAS ESTATISTICAS] Franqueado sem unidade_id - retornando vazio',
        );
        return {
          totalVendas: 0,
          vendasPagas: 0,
          vendasPendentes: 0,
          vendasFalhas: 0,
          valorTotal: 0,
          valorPago: 0,
        };
      }
      if (userUnidadeId) {
        console.log(
          '✅ [VENDAS ESTATISTICAS] Aplicando unidade do usuário:',
          userUnidadeId,
        );
        unidadeId = userUnidadeId;
      }
    } else {
      if (!isFranqueado && user?.tipo_usuario !== 'MASTER') {
        if (userUnidadeId && unidadeId !== userUnidadeId) {
          console.log('🚫 [VENDAS ESTATISTICAS] ACESSO NEGADO:', {
            solicitada: unidadeId,
            usuario: userUnidadeId,
          });
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

    return this.vendasService.estatisticas(unidadeId);
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
}
