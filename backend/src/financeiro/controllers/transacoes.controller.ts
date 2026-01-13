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

    // Buscar franqueado_id se for franqueado
    let franqueadoId: string | null = null;
    if (isFranqueado && user?.id) {
      const franqueadoResult = await this.dataSource.query(
        `SELECT id FROM teamcruz.franqueados WHERE usuario_id = $1 LIMIT 1`,
        [user.id],
      );
      franqueadoId = franqueadoResult[0]?.id || null;
    }

    if (!filtro.unidade_id) {
      if (isFranqueado) {
        // Será filtrado no service pelo franqueado_id
      } else if (userUnidadeId) {
        filtro.unidade_id = userUnidadeId;
      }
    } else {
      if (!isFranqueado && user.tipo_usuario !== 'MASTER') {
        if (userUnidadeId && filtro.unidade_id !== userUnidadeId) {
          return [];
        }
      }
    }

    const transacoes = await this.transacoesService.findAll(
      filtro,
      franqueadoId,
    );
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

    // Buscar franqueado_id se for franqueado
    let franqueadoId: string | null = null;
    if (isFranqueado && user?.id) {
      const franqueadoResult = await this.dataSource.query(
        `SELECT id FROM teamcruz.franqueados WHERE usuario_id = $1 LIMIT 1`,
        [user.id],
      );
      franqueadoId = franqueadoResult[0]?.id || null;
    }

    if (!filtro.unidade_id) {
      if (isFranqueado) {
        // Será filtrado no service pelo franqueado_id
      } else if (userUnidadeId) {
        filtro.unidade_id = userUnidadeId;
      }
    } else {
      if (!isFranqueado && user.tipo_usuario !== 'MASTER') {
        if (userUnidadeId && filtro.unidade_id !== userUnidadeId) {
          return {
            transacoes: [],
            resumo: { entradas: 0, saidas: 0, saldo: 0 },
          };
        }
      }
    }

    return this.transacoesService.getExtrato(filtro, franqueadoId);
  }
}
