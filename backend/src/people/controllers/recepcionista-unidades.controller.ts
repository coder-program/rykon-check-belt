import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RecepcionistaUnidadesService } from '../services/recepcionista-unidades.service';
import {
  CreateRecepcionistaUnidadeDto,
  UpdateRecepcionistaUnidadeDto,
} from '../dto/recepcionista-unidade.dto';

@Controller('recepcionista-unidades')
@UseGuards(JwtAuthGuard)
export class RecepcionistaUnidadesController {
  constructor(
    private readonly recepcionistaUnidadesService: RecepcionistaUnidadesService,
  ) {}

  /**
   * POST /recepcionista-unidades
   * Criar novo vínculo entre recepcionista e unidade
   */
  @Post()
  async create(
    @Body() dto: CreateRecepcionistaUnidadeDto,
    @Request() req: any,
  ) {
    return await this.recepcionistaUnidadesService.create(dto, req.user);
  }

  /**
   * GET /recepcionista-unidades
   * Listar todos os vínculos com filtros opcionais
   * Query params: usuario_id, unidade_id, ativo
   */
  @Get()
  async list(
    @Query('usuario_id') usuario_id?: string,
    @Query('unidade_id') unidade_id?: string,
    @Query('ativo') ativo?: string,
  ) {
    const filters: any = {};

    if (usuario_id) filters.usuario_id = usuario_id;
    if (unidade_id) filters.unidade_id = unidade_id;
    if (ativo !== undefined) filters.ativo = ativo === 'true';

    return await this.recepcionistaUnidadesService.list(filters);
  }

  /**
   * GET /recepcionista-unidades/recepcionista/:usuario_id
   * Obter todas as unidades de um recepcionista específico
   */
  @Get('recepcionista/:usuario_id')
  async getUnidadesByRecepcionista(@Param('usuario_id') usuario_id: string) {
    return await this.recepcionistaUnidadesService.getUnidadesByRecepcionista(
      usuario_id,
    );
  }

  /**
   * GET /recepcionista-unidades/unidade/:unidade_id
   * Obter todos os recepcionistas de uma unidade específica
   */
  @Get('unidade/:unidade_id')
  async getRecepcionistasByUnidade(@Param('unidade_id') unidade_id: string) {
    return await this.recepcionistaUnidadesService.getRecepcionistasByUnidade(
      unidade_id,
    );
  }

  /**
   * GET /recepcionista-unidades/me
   * Obter unidades do recepcionista logado
   */
  @Get('me')
  async getMyUnidades(@Request() req: any) {
    return await this.recepcionistaUnidadesService.getUnidadesByRecepcionista(
      req.user.id,
    );
  }

  /**
   * GET /recepcionista-unidades/:id
   * Obter um vínculo específico por ID
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.recepcionistaUnidadesService.findOne(id);
  }

  /**
   * PUT /recepcionista-unidades/:id
   * Atualizar um vínculo
   */
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateRecepcionistaUnidadeDto,
    @Request() req: any,
  ) {
    return await this.recepcionistaUnidadesService.update(id, dto, req.user);
  }

  /**
   * DELETE /recepcionista-unidades/:id/soft
   * Desativar vínculo (soft delete)
   */
  @Delete(':id/soft')
  async remove(@Param('id') id: string, @Request() req: any) {
    await this.recepcionistaUnidadesService.remove(id, req.user);
    return { message: 'Vínculo desativado com sucesso' };
  }

  /**
   * DELETE /recepcionista-unidades/:id
   * Deletar vínculo permanentemente
   */
  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.recepcionistaUnidadesService.delete(id);
    return { message: 'Vínculo deletado permanentemente' };
  }

  /**
   * GET /recepcionista-unidades/check/:usuario_id/:unidade_id
   * Verificar se usuário é recepcionista de uma unidade
   */
  @Get('check/:usuario_id/:unidade_id')
  async check(
    @Param('usuario_id') usuario_id: string,
    @Param('unidade_id') unidade_id: string,
  ) {
    const isRecepcionista =
      await this.recepcionistaUnidadesService.isRecepcionistaOfUnidade(
        usuario_id,
        unidade_id,
      );
    return { isRecepcionista };
  }
}
