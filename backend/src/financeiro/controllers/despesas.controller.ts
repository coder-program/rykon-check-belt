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
  UseInterceptors,
  UploadedFile,
  Inject,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DataSource } from 'typeorm';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { DespesasService } from '../services/despesas.service';
import { AnexosService } from '../services/anexos.service';
import {
  CreateDespesaDto,
  UpdateDespesaDto,
  BaixarDespesaDto,
} from '../dto/despesa.dto';

@Controller('despesas')
@UseGuards(JwtAuthGuard)
export class DespesasController {
  constructor(
    private readonly despesasService: DespesasService,
    private readonly anexosService: AnexosService,
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
  create(@Body() createDespesaDto: CreateDespesaDto, @Request() req) {
    return this.despesasService.create(createDespesaDto, req.user);
  }

  @Get()
  async findAll(
    @Query('unidade_id') unidade_id?: string,
    @Query('status') status?: any,
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

    console.log('🔍 [DESPESAS] Requisição recebida:', {
      usuario_id: user?.id,
      tipo_usuario: user?.tipo_usuario,
      unidade_id_usuario: userUnidadeId,
      filtro_unidade_id: unidade_id,
      status,
      isFranqueado,
    });

    if (!unidade_id) {
      if (isFranqueado) {
        console.log(
          '⚠️ [DESPESAS] Franqueado sem unidade_id - retornando vazio',
        );
        return [];
      }
      if (userUnidadeId) {
        console.log(
          '✅ [DESPESAS] Aplicando unidade do usuário:',
          userUnidadeId,
        );
        unidade_id = userUnidadeId;
      }
    } else {
      if (user && !isFranqueado && user.tipo_usuario !== 'MASTER') {
        if (userUnidadeId && unidade_id !== userUnidadeId) {
          console.log('🚫 [DESPESAS] ACESSO NEGADO');
          return [];
        }
      }
    }

    return this.despesasService.findAll(unidade_id, status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.despesasService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateDespesaDto: UpdateDespesaDto) {
    return this.despesasService.update(id, updateDespesaDto);
  }

  @Patch(':id/baixar')
  baixar(
    @Param('id') id: string,
    @Body() baixarDto: BaixarDespesaDto,
    @Request() req,
  ) {
    return this.despesasService.baixar(id, baixarDto, req.user);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.despesasService.remove(id);
  }

  @Get('resumo/pendentes')
  async resumoPendentes(@Query('unidade_id') unidade_id?: string) {
    const total = await this.despesasService.somarPendentes(unidade_id);
    return { total };
  }

  @Post(':id/anexar')
  @UseInterceptors(FileInterceptor('file'))
  async anexarComprovante(@Param('id') id: string, @UploadedFile() file: any) {
    return this.anexosService.anexarComprovanteDespesa(id, file);
  }

  @Delete(':id/anexo')
  async removerAnexo(@Param('id') id: string) {
    return this.anexosService.removerAnexoDespesa(id);
  }
}
