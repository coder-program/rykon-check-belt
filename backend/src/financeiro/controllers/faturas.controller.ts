import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Patch,
  Delete,
  Query,
  UseGuards,
  Request,
  Inject,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { DataSource } from 'typeorm';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { FaturasService } from '../services/faturas.service';
import { NotificacoesService } from '../services/notificacoes.service';
import { RecibosService } from '../services/recibos.service';
import {
  CreateFaturaDto,
  UpdateFaturaDto,
  BaixarFaturaDto,
} from '../dto/fatura.dto';

@Controller('faturas')
@UseGuards(JwtAuthGuard)
export class FaturasController {
  constructor(
    private readonly faturasService: FaturasService,
    private readonly notificacoesService: NotificacoesService,
    private readonly recibosService: RecibosService,
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
  create(@Body() createFaturaDto: CreateFaturaDto, @Request() req) {
    return this.faturasService.create(createFaturaDto, req.user);
  }

  @Get()
  async findAll(
    @Query('unidade_id') unidade_id?: string,
    @Query('status') status?: any,
    @Query('mes') mes?: string,
    @Request() req?: any,
  ) {
    const user = req?.user;
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

    if (!unidade_id) {
      if (isFranqueado) {
        // Será filtrado no service pelo franqueado_id
      } else if (userUnidadeId) {
        unidade_id = userUnidadeId;
      }
    } else {
      if (user && !isFranqueado && user.tipo_usuario !== 'MASTER') {
        if (userUnidadeId && unidade_id !== userUnidadeId) {
          return [];
        }
      }
    }

    const faturas = await this.faturasService.findAll(
      unidade_id,
      status,
      mes,
      franqueadoId,
    );

    // Mapear para incluir aluno_nome
    return faturas.map((fatura) => ({
      ...fatura,
      aluno_nome: fatura.aluno?.nome_completo,
    }));
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.faturasService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateFaturaDto: UpdateFaturaDto) {
    return this.faturasService.update(id, updateFaturaDto);
  }

  @Patch(':id/baixar')
  baixar(
    @Param('id') id: string,
    @Body() baixarDto: BaixarFaturaDto,
    @Request() req,
  ) {
    return this.faturasService.baixar(id, baixarDto, req.user);
  }

  @Patch(':id/cancelar')
  cancelar(@Param('id') id: string, @Body('motivo') motivo: string) {
    return this.faturasService.cancelar(id, motivo);
  }

  @Get('resumo/pendentes')
  async resumoPendentes(@Query('unidade_id') unidade_id?: string) {
    const total = await this.faturasService.somarPendentes(unidade_id);
    const quantidade = await this.faturasService.contarPendentes(unidade_id);
    return { total, quantidade };
  }

  @Get('aluno/:alunoId')
  findByAluno(@Param('alunoId') alunoId: string) {
    return this.faturasService.findByAluno(alunoId);
  }

  @Post(':id/enviar-cobranca-whatsapp')
  async enviarCobrancaWhatsapp(
    @Param('id') id: string,
    @Body('mensagem') mensagem?: string,
  ) {
    const fatura = await this.faturasService.findOne(id);
    await this.notificacoesService.enviarCobrancaWhatsapp(fatura, mensagem);
    return { message: 'Cobrança enviada via WhatsApp com sucesso' };
  }

  @Post(':id/parcelar')
  async parcelarFatura(
    @Param('id') id: string,
    @Body('numeroParcelas') numeroParcelas: number,
    @Request() req,
  ) {
    return this.faturasService.parcelarFatura(id, numeroParcelas, req.user);
  }

  @Post('gerar-faturas-assinaturas')
  async gerarFaturasAssinaturas(@Query('unidade_id') unidade_id?: string) {
    return this.faturasService.gerarFaturasAssinaturas(unidade_id);
  }

  @Get(':id/recibo')
  async gerarRecibo(@Param('id') id: string, @Res() res: Response) {
    try {
      const pdfBuffer = await this.recibosService.gerarReciboPDF(id);
      
      // Buscar fatura para nome do arquivo
      const fatura = await this.faturasService.findOne(id);
      const nomeArquivo = `recibo-${fatura.numero_fatura}.pdf`;

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${nomeArquivo}"`,
        'Content-Length': pdfBuffer.length,
      });

      res.status(HttpStatus.OK).send(pdfBuffer);
    } catch (error) {
      res.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: error.message || 'Erro ao gerar recibo',
      });
    }
  }
}
