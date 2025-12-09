import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
  Inject,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TransacoesService } from '../services/transacoes.service';
import { CreateTransacaoDto, FiltroTransacoesDto } from '../dto/transacao.dto';

@Controller('transacoes')
@UseGuards(JwtAuthGuard)
export class TransacoesController {
  constructor(
    private readonly transacoesService: TransacoesService,
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
  create(@Body() createTransacaoDto: CreateTransacaoDto, @Request() req) {
    return this.transacoesService.create(createTransacaoDto, req.user);
  }

  @Get()
  async findAll(@Query() filtro: FiltroTransacoesDto, @Request() req) {
    const user = req.user;
    const isFranqueado =
      user.tipo_usuario === 'FRANQUEADO' ||
      user.perfis?.some(
        (p: any) =>
          (typeof p === 'string' ? p : p.nome)?.toUpperCase() === 'FRANQUEADO',
      );
    const userUnidadeId = await this.getUnidadeIdFromUser(user);

    console.log('🔍 [TRANSACOES] Requisição recebida:', {
      usuario_id: user.id,
      tipo_usuario: user.tipo_usuario,
      unidade_id_usuario: userUnidadeId,
      filtro_unidade_id: filtro.unidade_id,
      perfis: user.perfis?.map((p: any) => p.nome || p),
      isFranqueado,
    });

    if (!filtro.unidade_id) {
      if (isFranqueado) {
        console.log(
          '⚠️ [TRANSACOES] Franqueado sem unidade_id - retornando vazio',
        );
        return [];
      }
      if (userUnidadeId) {
        console.log(
          '✅ [TRANSACOES] Aplicando unidade do usuário:',
          userUnidadeId,
        );
        filtro.unidade_id = userUnidadeId;
      }
    } else {
      if (!isFranqueado && user.tipo_usuario !== 'MASTER') {
        if (userUnidadeId && filtro.unidade_id !== userUnidadeId) {
          console.log('🚫 [TRANSACOES] ACESSO NEGADO:', {
            unidade_solicitada: filtro.unidade_id,
            unidade_usuario: userUnidadeId,
          });
          return [];
        }
      }
    }

    const transacoes = await this.transacoesService.findAll(filtro);
    return transacoes.map((transacao) => ({
      ...transacao,
      aluno_nome: transacao.aluno?.nome_completo,
      unidade_nome: transacao.unidade?.nome,
    }));
  }

  @Get('extrato')
  async getExtrato(@Query() filtro: FiltroTransacoesDto, @Request() req) {
    const user = req.user;
    const isFranqueado =
      user.tipo_usuario === 'FRANQUEADO' ||
      user.perfis?.some(
        (p: any) =>
          (typeof p === 'string' ? p : p.nome)?.toUpperCase() === 'FRANQUEADO',
      );
    const userUnidadeId = await this.getUnidadeIdFromUser(user);

    console.log('📋 [EXTRATO] Requisição recebida:', {
      usuario_id: user.id,
      isFranqueado,
      unidade_id_usuario: userUnidadeId,
      filtro_unidade_id: filtro.unidade_id,
    });

    if (!filtro.unidade_id) {
      if (isFranqueado) {
        console.log('⚠️ [EXTRATO] Franqueado sem unidade_id');
        return { transacoes: [], resumo: { entradas: 0, saidas: 0, saldo: 0 } };
      }
      if (userUnidadeId) {
        console.log(
          '✅ [EXTRATO] Aplicando unidade do usuário:',
          userUnidadeId,
        );
        filtro.unidade_id = userUnidadeId;
      }
    } else {
      if (!isFranqueado && user.tipo_usuario !== 'MASTER') {
        if (userUnidadeId && filtro.unidade_id !== userUnidadeId) {
          console.log('🚫 [EXTRATO] ACESSO NEGADO');
          return {
            transacoes: [],
            resumo: { entradas: 0, saidas: 0, saldo: 0 },
          };
        }
      }
    }

    return this.transacoesService.getExtrato(filtro);
  }
}
